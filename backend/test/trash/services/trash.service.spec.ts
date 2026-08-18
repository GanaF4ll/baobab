import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { OrderFilter } from 'src/shared/constants';
import { StorageService } from 'src/shared/storage/storage.service';
import { RessouceType, TrashFilterDto } from 'src/trash/dto/input/trash-filter.dto';
import { TrashService } from 'src/trash/services/trash.service';

jest.mock('drizzle-orm/pg-core', () => {
  const actual = jest.requireActual('drizzle-orm/pg-core');
  return {
    ...actual,
    unionAll: jest.fn().mockImplementation((..._queries: any[]) => ({
      as: jest.fn().mockReturnValue('trash_union'),
    })),
  };
});

describe('TrashService', () => {
  let service: TrashService;
  let dbMock: any;
  let storageServiceMock: any;

  const mockDeletedWorkspace = {
    id: 'ws-1',
    type: 'workspace',
    title: 'Trash Workspace',
    workspaceId: null,
    workspaceName: null,
    deletedAt: new Date('2026-08-10T12:00:00Z'),
  };

  const mockDeletedDocument = {
    id: 'doc-1',
    type: 'document',
    title: 'Trash Document',
    workspaceId: 'ws-1',
    workspaceName: 'Trash Workspace',
    deletedAt: new Date('2026-08-11T12:00:00Z'),
  };

  const mockDeletedConversation = {
    id: 'conv-1',
    type: 'conversation',
    title: 'Trash Conversation',
    workspaceId: 'ws-1',
    workspaceName: 'Trash Workspace',
    deletedAt: new Date('2026-08-12T12:00:00Z'),
  };

  const setupDbMock = (options: {
    countValue?: number;
    rawRows?: any[];
    docMeta?: any[];
    convMeta?: any[];
    expiredWorkspaces?: any[];
    expiredDocuments?: any[];
    expiredConversations?: any[];
    workspaceDocs?: any[];
    workspaceVersions?: any[];
    docVersions?: any[];
  }) => {
    const {
      countValue = 3,
      rawRows = [mockDeletedConversation, mockDeletedDocument, mockDeletedWorkspace],
      docMeta = [{ id: 'doc-1', mimeType: 'application/pdf' }],
      convMeta = [{ conversationId: 'conv-1', messageCount: 5 }],
      expiredWorkspaces = [],
      expiredDocuments = [],
      expiredConversations = [],
      workspaceDocs = [],
      workspaceVersions = [],
      docVersions = [],
    } = options;

    const selectMock = jest.fn().mockImplementation((fields?: any) => {
      const qb: any = {
        as: jest.fn().mockImplementation((alias: string) => ({ alias, qb })),
        getSelectedFields: jest.fn().mockReturnValue({}),
      };

      qb.from = jest.fn().mockImplementation((fromTarget: any) => {
        // If selecting count() from trashUnion
        if (fields && 'countValue' in fields) {
          const countPromise = Promise.resolve([{ countValue }]);
          return Object.assign(countPromise, qb);
        }

        // If selecting docMeta from schema.documents
        if (fromTarget === schema.documents && fields && 'mimeType' in fields) {
          qb.where = jest.fn().mockResolvedValue(docMeta);
          return qb;
        }

        // If selecting convMeta from schema.messages
        if (fromTarget === schema.messages && fields && 'messageCount' in fields) {
          qb.where = jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(convMeta),
          });
          return qb;
        }

        // If selecting items from trashUnion with limit/offset
        qb.leftJoin = jest.fn().mockReturnValue(qb);
        qb.where = jest.fn().mockReturnValue(qb);
        qb.orderBy = jest.fn().mockReturnValue(qb);
        qb.limit = jest.fn().mockReturnValue(qb);
        qb.offset = jest.fn().mockResolvedValue(rawRows);

        return qb;
      });

      return qb;
    });

    const deleteWhereMock = jest.fn().mockResolvedValue([]);
    const deleteMock = jest.fn().mockReturnValue({
      where: deleteWhereMock,
    });

    let docCallCount = 0;
    const documentsFindManyMock = jest.fn().mockImplementation(() => {
      docCallCount++;
      // First call is expiredDocuments, subsequent calls are workspaceDocs
      if (docCallCount === 1) {
        return Promise.resolve(expiredDocuments);
      }
      return Promise.resolve(workspaceDocs);
    });

    let versionCallCount = 0;
    const documentVersionsFindManyMock = jest.fn().mockImplementation(() => {
      versionCallCount++;
      // If workspaceVersions exist and it's first version call, return workspaceVersions
      if (workspaceVersions.length > 0 && versionCallCount === 1) {
        return Promise.resolve(workspaceVersions);
      }
      return Promise.resolve(docVersions);
    });

    const queryMock = {
      workspaces: {
        findMany: jest.fn().mockResolvedValue(expiredWorkspaces),
      },
      documents: {
        findMany: documentsFindManyMock,
      },
      conversations: {
        findMany: jest.fn().mockResolvedValue(expiredConversations),
      },
      documentVersions: {
        findMany: documentVersionsFindManyMock,
      },
    };

    return {
      select: selectMock,
      delete: deleteMock,
      deleteWhereMock,
      query: queryMock,
    };
  };

  beforeEach(async () => {
    dbMock = setupDbMock({});
    storageServiceMock = {
      deleteBulk: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrashService,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
        {
          provide: StorageService,
          useValue: storageServiceMock,
        },
      ],
    }).compile();

    service = module.get<TrashService>(TrashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return empty result if no resource type matches the query filter', async () => {
      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {
        ressourceType: ['NonExistentType' as any],
      };

      const result = await service.findAll(userId, filters);

      expect(result).toEqual({
        items: [],
        totalCount: 0,
        nextCursor: null,
      });
    });

    it('should query and return all trashed items with metadata, totalCount and nextCursor', async () => {
      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {
        limit: 10,
        offset: 0,
      };

      const result = await service.findAll(userId, filters);

      expect(result.totalCount).toBe(3);
      expect(result.nextCursor).toBeNull();
      expect(result.items).toHaveLength(3);

      // Check conversation item and enriched metadata
      const convItem = result.items.find((i) => i.type === 'conversation');
      expect(convItem).toBeDefined();
      expect(convItem?.title).toBe('Trash Conversation');
      expect(convItem?.metadata?.messageCount).toBe(5);
      expect(convItem?.workspaceId).toBe('ws-1');

      // Check document item and enriched metadata
      const docItem = result.items.find((i) => i.type === 'document');
      expect(docItem).toBeDefined();
      expect(docItem?.title).toBe('Trash Document');
      expect(docItem?.metadata?.mimeType).toBe('application/pdf');
      expect(docItem?.workspaceName).toBe('Trash Workspace');

      // Check workspace item
      const wsItem = result.items.find((i) => i.type === 'workspace');
      expect(wsItem).toBeDefined();
      expect(wsItem?.title).toBe('Trash Workspace');
      expect(wsItem?.workspaceId).toBeUndefined();
    });

    it('should filter by ressourceType for single type (e.g. Document only)', async () => {
      const customDb = setupDbMock({
        countValue: 1,
        rawRows: [mockDeletedDocument],
        docMeta: [{ id: 'doc-1', mimeType: 'text/markdown' }],
      });
      (service as any).db = customDb;

      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {
        ressourceType: [RessouceType.Document],
      };

      const result = await service.findAll(userId, filters);

      expect(result.totalCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('document');
      expect(result.items[0].metadata?.mimeType).toBe('text/markdown');
    });

    it('should filter by ressourceType for Workspace only', async () => {
      const customDb = setupDbMock({
        countValue: 1,
        rawRows: [mockDeletedWorkspace],
      });
      (service as any).db = customDb;

      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {
        ressourceType: [RessouceType.Workspace],
      };

      const result = await service.findAll(userId, filters);

      expect(result.totalCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('workspace');
    });

    it('should filter by ressourceType for Conversation only', async () => {
      const customDb = setupDbMock({
        countValue: 1,
        rawRows: [mockDeletedConversation],
        convMeta: [{ conversationId: 'conv-1', messageCount: 12 }],
      });
      (service as any).db = customDb;

      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {
        ressourceType: [RessouceType.Conversation],
      };

      const result = await service.findAll(userId, filters);

      expect(result.totalCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('conversation');
      expect(result.items[0].metadata?.messageCount).toBe(12);
    });

    it('should correctly calculate nextCursor when items exceed limit', async () => {
      const items = [
        { ...mockDeletedDocument, id: 'doc-1' },
        { ...mockDeletedDocument, id: 'doc-2' },
        { ...mockDeletedDocument, id: 'doc-3' },
      ];

      const customDb = setupDbMock({
        countValue: 5,
        rawRows: items, // 3 items returned for limit of 2
        docMeta: [
          { id: 'doc-1', mimeType: 'application/pdf' },
          { id: 'doc-2', mimeType: 'application/pdf' },
        ],
      });
      (service as any).db = customDb;

      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {
        limit: 2,
        offset: 0,
      };

      const result = await service.findAll(userId, filters);

      expect(result.totalCount).toBe(5);
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('doc-2');
    });

    it('should apply search filter and order', async () => {
      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {
        search: 'Report',
        order: OrderFilter.ASC,
      };

      const result = await service.findAll(userId, filters);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(3);
    });

    it('should use default values when no filters provided', async () => {
      const result = await service.findAll('user-uuid-1');

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);
    });
  });

  describe('purgeAllRessourcesMarkedForDeletion', () => {
    it('should do nothing when there are no expired resources', async () => {
      const customDb = setupDbMock({
        expiredWorkspaces: [],
        expiredDocuments: [],
        expiredConversations: [],
      });
      (service as any).db = customDb;

      await service.purgeAllRessourcesMarkedForDeletion(30);

      expect(storageServiceMock.deleteBulk).not.toHaveBeenCalled();
      expect(customDb.delete).not.toHaveBeenCalled();
    });

    it('should purge expired workspaces along with their storage files and cascade deletion', async () => {
      const customDb = setupDbMock({
        expiredWorkspaces: [{ id: 'ws-expired-1' }],
        expiredDocuments: [],
        expiredConversations: [],
        workspaceDocs: [{ id: 'doc-in-ws-1' }],
        workspaceVersions: [
          { storageKey: 'documents/doc-in-ws-1/1/file1.pdf' },
          { storageKey: 'documents/doc-in-ws-1/2/file2.pdf' },
        ],
      });
      (service as any).db = customDb;

      await service.purgeAllRessourcesMarkedForDeletion(30);

      expect(storageServiceMock.deleteBulk).toHaveBeenCalledWith([
        'documents/doc-in-ws-1/1/file1.pdf',
        'documents/doc-in-ws-1/2/file2.pdf',
      ]);
      expect(customDb.delete).toHaveBeenCalledTimes(1);
      expect(customDb.delete).toHaveBeenCalledWith(schema.workspaces);
    });

    it('should purge standalone expired documents in active workspaces', async () => {
      const customDb = setupDbMock({
        expiredWorkspaces: [],
        expiredDocuments: [{ id: 'doc-standalone-1', workspaceId: 'ws-active' }],
        expiredConversations: [],
        docVersions: [{ storageKey: 'documents/doc-standalone-1/1/report.pdf' }],
      });
      (service as any).db = customDb;

      await service.purgeAllRessourcesMarkedForDeletion(30);

      expect(storageServiceMock.deleteBulk).toHaveBeenCalledWith([
        'documents/doc-standalone-1/1/report.pdf',
      ]);
      expect(customDb.delete).toHaveBeenCalledTimes(1);
      expect(customDb.delete).toHaveBeenCalledWith(schema.documents);
    });

    it('should purge standalone expired conversations in active workspaces', async () => {
      const customDb = setupDbMock({
        expiredWorkspaces: [],
        expiredDocuments: [],
        expiredConversations: [{ id: 'conv-standalone-1', workspaceId: 'ws-active' }],
      });
      (service as any).db = customDb;

      await service.purgeAllRessourcesMarkedForDeletion(30);

      expect(storageServiceMock.deleteBulk).not.toHaveBeenCalled();
      expect(customDb.delete).toHaveBeenCalledTimes(1);
      expect(customDb.delete).toHaveBeenCalledWith(schema.conversations);
    });

    it('should handle mixed expired resources without duplicate deletions for documents in expired workspaces', async () => {
      const customDb = setupDbMock({
        expiredWorkspaces: [{ id: 'ws-expired-1' }],
        // doc-1 is inside ws-expired-1 (should be filtered out from standalone delete)
        // doc-2 is inside ws-active (should be kept for standalone delete)
        expiredDocuments: [
          { id: 'doc-1', workspaceId: 'ws-expired-1' },
          { id: 'doc-2', workspaceId: 'ws-active' },
        ],
        // conv-1 is inside ws-expired-1 (should be filtered out)
        // conv-2 is inside ws-active (should be kept)
        expiredConversations: [
          { id: 'conv-1', workspaceId: 'ws-expired-1' },
          { id: 'conv-2', workspaceId: 'ws-active' },
        ],
        workspaceDocs: [{ id: 'doc-1' }],
        workspaceVersions: [{ storageKey: 'ws1-file.pdf' }],
        docVersions: [{ storageKey: 'standalone-doc2-file.pdf' }],
      });
      (service as any).db = customDb;

      await service.purgeAllRessourcesMarkedForDeletion(30);

      // Storage should delete both workspace files and standalone doc files
      expect(storageServiceMock.deleteBulk).toHaveBeenCalledWith([
        'ws1-file.pdf',
        'standalone-doc2-file.pdf',
      ]);

      // DB delete should be called for workspaces (ws-expired-1), documents (doc-2 only), conversations (conv-2 only)
      expect(customDb.delete).toHaveBeenCalledTimes(3);
      expect(customDb.delete).toHaveBeenCalledWith(schema.workspaces);
      expect(customDb.delete).toHaveBeenCalledWith(schema.documents);
      expect(customDb.delete).toHaveBeenCalledWith(schema.conversations);
    });

    it('should default retention period to 30 days when not specified', async () => {
      const customDb = setupDbMock({
        expiredWorkspaces: [],
        expiredDocuments: [],
        expiredConversations: [],
      });
      (service as any).db = customDb;

      await service.purgeAllRessourcesMarkedForDeletion();

      expect(customDb.query.workspaces.findMany).toHaveBeenCalled();
    });
  });
});
