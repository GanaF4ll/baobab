import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNotNull, like, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { CollectionResponseData } from 'src/shared/dto/output/api-collection-response.dto';
import { StorageService } from 'src/shared/storage/storage.service';
import { TrashFilterDto } from '../dto/input/trash-filter.dto';
import { TrashItemDto } from '../dto/output/trash-response.dto';
import { RawTrashRow, TrashMapper } from '../mappers/trash.mapper';

@Injectable()
export class TrashService {
  constructor(
    @Inject(DRIZZLE) readonly db: DrizzleDb,
    readonly storage: StorageService,
  ) {}

  private readonly logger = new Logger(TrashService.name);

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

  /**
   * Purge all resources that were marked for deletion older than the specified retention period.
   * Also deletes physical files on S3/storage.
   * @param retentionDays Number of days before permanent deletion (defaults to 30)
   */
  async purgeAllRessourcesMarkedForDeletion(retentionDays = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const expiredWorkspaces = await this.db.query.workspaces.findMany({
      where: (ws, { and, isNotNull, lte }) =>
        and(isNotNull(ws.deletedAt), lte(ws.deletedAt, cutoffDate)),
      columns: { id: true },
    });
    const expiredWorkspaceIds = expiredWorkspaces.map((w) => w.id);

    const expiredDocuments = await this.db.query.documents.findMany({
      where: (doc, { and, isNotNull, lte }) =>
        and(isNotNull(doc.deletedAt), lte(doc.deletedAt, cutoffDate)),
      columns: { id: true, workspaceId: true },
    });
    const standaloneDocumentIds = expiredDocuments
      .filter((d) => !expiredWorkspaceIds.includes(d.workspaceId))
      .map((d) => d.id);

    const expiredConversations = await this.db.query.conversations.findMany({
      where: (conv, { and, isNotNull, lte }) =>
        and(isNotNull(conv.deletedAt), lte(conv.deletedAt, cutoffDate)),
      columns: { id: true, workspaceId: true },
    });
    const standaloneConversationIds = expiredConversations
      .filter((c) => !expiredWorkspaceIds.includes(c.workspaceId))
      .map((c) => c.id);

    const storageKeysToDelete: string[] = [];

    if (expiredWorkspaceIds.length > 0) {
      const wsDocs = await this.db.query.documents.findMany({
        where: (doc, { inArray }) => inArray(doc.workspaceId, expiredWorkspaceIds),
        columns: { id: true },
      });
      const wsDocIds = wsDocs.map((d) => d.id);

      if (wsDocIds.length > 0) {
        const wsVersions = await this.db.query.documentVersions.findMany({
          where: (v, { inArray }) => inArray(v.documentId, wsDocIds),
          columns: { storageKey: true },
        });
        storageKeysToDelete.push(...wsVersions.map((v) => v.storageKey));
      }
    }

    if (standaloneDocumentIds.length > 0) {
      const docVersions = await this.db.query.documentVersions.findMany({
        where: (v, { inArray }) => inArray(v.documentId, standaloneDocumentIds),
        columns: { storageKey: true },
      });
      storageKeysToDelete.push(...docVersions.map((v) => v.storageKey));
    }

    // Delete physical files from S3/MinIO
    if (storageKeysToDelete.length > 0) {
      this.logger.log(`Deleting ${storageKeysToDelete.length} files from storage...`);
      await this.storage.deleteBulk(storageKeysToDelete);
    }

    // Delete entities from the database
    if (expiredWorkspaceIds.length > 0) {
      this.logger.log(`Purging ${expiredWorkspaceIds.length} expired workspaces...`);
      await this.db
        .delete(schema.workspaces)
        .where(inArray(schema.workspaces.id, expiredWorkspaceIds));
    }

    if (standaloneDocumentIds.length > 0) {
      this.logger.log(`Purging ${standaloneDocumentIds.length} standalone expired documents...`);
      await this.db
        .delete(schema.documents)
        .where(inArray(schema.documents.id, standaloneDocumentIds));
    }

    if (standaloneConversationIds.length > 0) {
      this.logger.log(
        `Purging ${standaloneConversationIds.length} standalone expired conversations...`,
      );
      await this.db
        .delete(schema.conversations)
        .where(inArray(schema.conversations.id, standaloneConversationIds));
    }
  }
}
