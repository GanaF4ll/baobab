import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { StorageService } from 'src/shared/storage/storage.service';
import { TrashItemDto } from './dto/output/trash-response.dto';
import { TrashMapper } from './mappers/trash.mapper';

@Injectable()
export class TrashService {
  constructor(
    @Inject(DRIZZLE) readonly db: DrizzleDb,
    readonly _storage: StorageService,
  ) {}

  /**
   * Find all trashed items for a user
   * @param userId The ID of the user
   * @param limit The maximum number of items to return
   * @param offset The number of items to skip
   * @returns A promise that resolves to an array of trashed items TrashItemDto[]
   */
  //todo: Base filter
  async findAll(userId: string, limit = 20, offset = 0): Promise<TrashItemDto[]> {
    // Subquery - deleted workspaces
    const deletedWorkspaces = this.db
      .select({
        id: schema.workspaces.id,
        type: sql<string>`'workspace'`.as('type'),
        title: schema.workspaces.name,
        workspaceId: sql<string | null>`NULL`.as('workspace_id'),
        workspaceName: sql<string | null>`NULL`.as('workspace_name'),
        deletedAt: schema.workspaces.deletedAt,
      })
      .from(schema.workspaces)
      .where(and(eq(schema.workspaces.ownerId, userId), isNotNull(schema.workspaces.deletedAt)));

    // Subquery - deleted documents
    const deletedDocuments = this.db
      .select({
        id: schema.documents.id,
        type: sql<string>`'document'`.as('type'),
        title: schema.documents.title,
        workspaceId: schema.documents.workspaceId,
        workspaceName: schema.workspaces.name,
        deletedAt: schema.documents.deletedAt,
      })
      .from(schema.documents)
      .leftJoin(schema.workspaces, eq(schema.documents.workspaceId, schema.workspaces.id))
      .where(and(eq(schema.documents.userId, userId), isNotNull(schema.documents.deletedAt)));

    // Subquery - deleted conversations
    const deletedConversations = this.db
      .select({
        id: schema.conversations.id,
        type: sql<string>`'conversation'`.as('type'),
        title: schema.conversations.title,
        workspaceId: schema.conversations.workspaceId,
        workspaceName: schema.workspaces.name,
        deletedAt: schema.conversations.deletedAt,
      })
      .from(schema.conversations)
      .leftJoin(schema.workspaces, eq(schema.conversations.workspaceId, schema.workspaces.id))
      .where(
        and(eq(schema.conversations.userId, userId), isNotNull(schema.conversations.deletedAt)),
      );

    // Combine with unionAll + Sort & Pagination
    const trashUnion = unionAll(deletedWorkspaces, deletedDocuments, deletedConversations).as(
      'trash',
    );

    const items = await this.db
      .select()
      .from(trashUnion)
      .orderBy(desc(trashUnion.deletedAt))
      .limit(limit)
      .offset(offset);

    // Enrichment with metadata per type
    const documentIds = items.filter((i) => i.type === 'document').map((i) => i.id);
    const conversationIds = items.filter((i) => i.type === 'conversation').map((i) => i.id);

    // Fetch mimeType for documents
    const documentMetaMap = new Map<string, string>();
    if (documentIds.length > 0) {
      const docMeta = await this.db
        .select({
          id: schema.documents.id,
          mimeType: schema.documents.mimeType,
        })
        .from(schema.documents)
        .where(inArray(schema.documents.id, documentIds));

      for (const doc of docMeta) {
        documentMetaMap.set(doc.id, doc.mimeType);
      }
    }

    // Fetch messageCount for conversations
    const conversationMetaMap = new Map<string, number>();
    if (conversationIds.length > 0) {
      const convMeta = await this.db
        .select({
          conversationId: schema.messages.conversationId,
          messageCount: count(),
        })
        .from(schema.messages)
        .where(inArray(schema.messages.conversationId, conversationIds))
        .groupBy(schema.messages.conversationId);

      for (const conv of convMeta) {
        conversationMetaMap.set(conv.conversationId, conv.messageCount);
      }
    }

    // 6. Mapping vers TrashItemDto[]
    return TrashMapper.toDto(items, documentMetaMap, conversationMetaMap);
  }
}
