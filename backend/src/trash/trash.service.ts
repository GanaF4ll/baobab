import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNotNull, like, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { CollectionResponseData } from 'src/shared/dto/output/api-collection-response.dto';
import { StorageService } from 'src/shared/storage/storage.service';
import { TrashFilterDto } from './dto/input/trash-filter.dto';
import { TrashItemDto } from './dto/output/trash-response.dto';
import { RawTrashRow, TrashMapper } from './mappers/trash.mapper';

@Injectable()
export class TrashService {
  constructor(
    @Inject(DRIZZLE) readonly db: DrizzleDb,
    readonly _storage: StorageService,
  ) {}

  /**
   * Find all trashed items for a user
   * @param userId The ID of the user
   * @param filters The filters to apply to the query
   * @returns A promise that resolves to a collection response with items, totalCount and nextCursor
   */
  async findAll(
    userId: string,
    filters: TrashFilterDto = {},
  ): Promise<CollectionResponseData<TrashItemDto>> {
    const { limit = 20, offset = 0, ressourceType, search, order } = filters || {};
    const take = limit;

    const workspaceConditions = [
      eq(schema.workspaces.ownerId, userId),
      isNotNull(schema.workspaces.deletedAt),
    ];
    if (search) {
      workspaceConditions.push(like(schema.workspaces.name, `%${search}%`));
    }

    // Subquery - deleted workspaces
    const deletedWorkspaces = this.db
      .select({
        id: schema.workspaces.id,
        type: sql<string>`'workspace'`.as('type'),
        title: schema.workspaces.name,
        workspaceId: sql<string | null>`NULL`.as('workspace_id'),
        workspaceName: sql<string | null>`NULL`.as('workspace_name'),
        deletedAt: schema.workspaces.deletedAt,
        icon: schema.workspaces.icon,
      })
      .from(schema.workspaces)
      .where(and(...workspaceConditions));

    const documentConditions = [
      eq(schema.documents.userId, userId),
      isNotNull(schema.documents.deletedAt),
    ];
    if (search) {
      documentConditions.push(like(schema.documents.title, `%${search}%`));
    }

    // Subquery - deleted documents
    const deletedDocuments = this.db
      .select({
        id: schema.documents.id,
        type: sql<string>`'document'`.as('type'),
        title: schema.documents.title,
        workspaceId: schema.documents.workspaceId,
        workspaceName: schema.workspaces.name,
        deletedAt: schema.documents.deletedAt,
        icon: sql<string | null>`NULL`.as('icon'),
      })
      .from(schema.documents)
      .leftJoin(schema.workspaces, eq(schema.documents.workspaceId, schema.workspaces.id))
      .where(and(...documentConditions));

    const conversationConditions = [
      eq(schema.conversations.userId, userId),
      isNotNull(schema.conversations.deletedAt),
    ];
    if (search) {
      conversationConditions.push(like(schema.conversations.title, `%${search}%`));
    }

    // Subquery - deleted conversations
    const deletedConversations = this.db
      .select({
        id: schema.conversations.id,
        type: sql<string>`'conversation'`.as('type'),
        title: schema.conversations.title,
        workspaceId: schema.conversations.workspaceId,
        workspaceName: schema.workspaces.name,
        deletedAt: schema.conversations.deletedAt,
        icon: sql<string | null>`NULL`.as('icon'),
      })
      .from(schema.conversations)
      .leftJoin(schema.workspaces, eq(schema.conversations.workspaceId, schema.workspaces.id))
      .where(and(...conversationConditions));

    // Select the appropriate queries based on the resource type filter
    const queryMap = {
      Workspace: deletedWorkspaces,
      Document: deletedDocuments,
      Conversation: deletedConversations,
    } as const;

    const allTypes = Object.keys(queryMap) as (keyof typeof queryMap)[];
    const selectedTypes =
      ressourceType && ressourceType.length > 0
        ? allTypes.filter((t) => ressourceType.includes(t as any))
        : allTypes;

    const selectedQueries = selectedTypes.map((t) => queryMap[t]);

    if (selectedQueries.length === 0) {
      return {
        items: [],
        totalCount: 0,
        nextCursor: null,
      };
    }

    let trashUnion: any;
    if (selectedQueries.length === 1) {
      trashUnion = selectedQueries[0].as('trash');
    } else {
      const [first, ...rest] = selectedQueries;
      trashUnion = (unionAll as any)(first, ...rest).as('trash');
    }

    // Fetch totalCount and items
    const [[totalCountResult], rawRows] = await Promise.all([
      this.db.select({ countValue: count() }).from(trashUnion),
      this.db
        .select()
        .from(trashUnion)
        .orderBy(order === 'asc' ? asc(trashUnion.deletedAt) : desc(trashUnion.deletedAt))
        .limit(take + 1)
        .offset(offset),
    ]);

    const totalCount = Number(totalCountResult?.countValue ?? 0);
    const hasNextPage = rawRows.length > take;
    const itemsToProcess = hasNextPage ? rawRows.slice(0, take) : rawRows;
    const nextCursor = hasNextPage ? itemsToProcess[itemsToProcess.length - 1]?.id : null;

    // Enrichment with metadata per type
    const documentIds = itemsToProcess.filter((i) => i.type === 'document').map((i) => i.id);
    const conversationIds = itemsToProcess
      .filter((i) => i.type === 'conversation')
      .map((i) => i.id);

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

    // Mapping to TrashItemDto[]
    const items = TrashMapper.toDto(
      itemsToProcess as RawTrashRow[],
      documentMetaMap,
      conversationMetaMap,
    );

    return {
      items,
      totalCount,
      nextCursor,
    };
  }
}
