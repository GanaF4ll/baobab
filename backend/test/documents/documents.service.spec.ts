import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from 'src/documents/documents.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { StorageService } from 'src/shared/storage/storage.service';
import { NotFoundException } from '@nestjs/common';
import * as schema from 'src/drizzle/schema';
import { StorageFolderName, OrderFilter } from 'src/shared/constants';
import { ParserFactory } from 'src/documents/parsers/parser.factory';
import { ChunkerService } from 'src/documents/chunking/chunker.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let dbMock: any;
  let storageServiceMock: jest.Mocked<StorageService>;
  let parserFactoryMock: any;
  let chunkerServiceMock: any;

  beforeEach(async () => {
    // Re-create mocks for each test to avoid pollution
    dbMock = {
      query: {
        documents: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
      },
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    storageServiceMock = {
      upload: jest.fn(),
      deleteFile: jest.fn(),
    } as any;

    parserFactoryMock = {
      getParser: jest.fn(),
    };

    chunkerServiceMock = {
      chunkText: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
        {
          provide: StorageService,
          useValue: storageServiceMock,
        },
        {
          provide: ParserFactory,
          useValue: parserFactoryMock,
        },
        {
          provide: ChunkerService,
          useValue: chunkerServiceMock,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    const userId = 'user-123';
    const mockFile = {
      buffer: Buffer.from('test'),
      mimetype: 'application/pdf',
      originalname: 'test.pdf',
    };

    it('successfully creates a new document and its first version if documentId is not provided', async () => {
      const mockDoc = { id: 'new-doc-id', title: 'test.pdf', currentVersion: 1 };
      const mockVersion = {
        id: 'new-version-id',
        documentId: 'new-doc-id',
        versionNumber: 1,
        storageKey: 'new-doc-id/1/test.pdf',
      };

      const returningMock = jest
        .fn()
        .mockResolvedValueOnce([mockDoc]) // For documents insert
        .mockResolvedValueOnce([mockVersion]); // For documentVersions insert
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      dbMock.insert = jest.fn().mockReturnValue({ values: valuesMock });

      storageServiceMock.upload.mockResolvedValue('new-doc-id/1/test.pdf');

      const result = await service.create(userId, mockFile);

      expect(dbMock.insert).toHaveBeenCalledTimes(2);
      expect(storageServiceMock.upload).toHaveBeenCalledWith(
        StorageFolderName.DOCUMENTS,
        'new-doc-id/1/test.pdf',
        mockFile.buffer,
      );
      expect(result).toEqual(mockDoc);
    });

    it('successfully adds a new version to an existing document if documentId is provided', async () => {
      const docId = 'doc-123';
      const mockDoc = { id: docId, currentVersion: 1 };
      const mockVersion = {
        id: 'new-version-id',
        documentId: docId,
        versionNumber: 2,
        storageKey: 'doc-123/2/test.pdf',
      };

      dbMock.query.documents.findFirst.mockResolvedValue(mockDoc);

      const returningMock = jest.fn().mockResolvedValue([mockVersion]);
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      dbMock.insert = jest.fn().mockReturnValue({ values: valuesMock });

      storageServiceMock.upload.mockResolvedValue('doc-123/2/test.pdf');

      const result = await service.create(userId, mockFile, docId);

      expect(dbMock.query.documents.findFirst).toHaveBeenCalled();
      expect(dbMock.insert).toHaveBeenCalledTimes(1);
      expect(storageServiceMock.upload).toHaveBeenCalledWith(
        StorageFolderName.DOCUMENTS,
        'doc-123/2/test.pdf',
        mockFile.buffer,
      );
      expect(result).toEqual(mockVersion);
    });

    it('throws NotFoundException if documentId is provided but document is not found', async () => {
      dbMock.query.documents.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, mockFile, 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    const userId = 'user-id-123';

    it('returns documents list, count and nextCursor without filter', async () => {
      const mockDocs = [
        { id: 'doc-1', createdAt: new Date('2026-06-15T12:00:00.000Z') },
        { id: 'doc-2', createdAt: new Date('2026-06-14T12:00:00.000Z') },
      ];

      // Mock database findMany
      dbMock.query.documents.findMany.mockResolvedValue(mockDocs);

      // Mock database count select query chain
      const countValue = 2;
      const selectWhereMock = jest.fn().mockResolvedValue([{ countValue }]);
      const selectFromMock = jest.fn().mockReturnValue({ where: selectWhereMock });
      dbMock.select.mockReturnValue({ from: selectFromMock });

      const result = await service.findAll(userId, {} as any);

      expect(dbMock.query.documents.findMany).toHaveBeenCalled();
      expect(dbMock.select).toHaveBeenCalled();
      expect(result).toEqual({
        items: mockDocs,
        totalCount: countValue,
        nextCursor: null,
      });
    });

    it('handles pagination and sets nextCursor when more items are available', async () => {
      const mockDocs = [
        { id: 'doc-1', createdAt: new Date('2026-06-15T12:00:00.000Z') },
        { id: 'doc-2', createdAt: new Date('2026-06-14T12:00:00.000Z') },
      ];

      // Request limit is 1, but findMany returns 2 items (take + 1)
      dbMock.query.documents.findMany.mockResolvedValue(mockDocs);

      const selectWhereMock = jest.fn().mockResolvedValue([{ countValue: 5 }]);
      const selectFromMock = jest.fn().mockReturnValue({ where: selectWhereMock });
      dbMock.select.mockReturnValue({ from: selectFromMock });

      const result = await service.findAll(userId, { limit: 1 } as any);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(mockDocs[0]);
      expect(result.totalCount).toBe(5);
      expect(result.nextCursor).toBe('doc-1');
    });

    it('filters by cursor date when cursor is provided', async () => {
      const cursorDoc = { id: 'doc-cursor', createdAt: new Date('2026-06-13T12:00:00.000Z') };
      dbMock.query.documents.findFirst.mockResolvedValue(cursorDoc);
      dbMock.query.documents.findMany.mockResolvedValue([]);

      const selectWhereMock = jest.fn().mockResolvedValue([{ countValue: 0 }]);
      const selectFromMock = jest.fn().mockReturnValue({ where: selectWhereMock });
      dbMock.select.mockReturnValue({ from: selectFromMock });

      await service.findAll(userId, { cursor: 'doc-cursor', order: OrderFilter.ASC } as any);

      expect(dbMock.query.documents.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Function),
        }),
      );
      expect(dbMock.query.documents.findMany).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    const docId = 'doc-123';
    const userId = 'user-123';

    it('returns the document metadata if found', async () => {
      const mockDoc = { id: docId, currentVersion: 1, mimeType: 'application/pdf' };
      dbMock.query.documents.findFirst.mockResolvedValue(mockDoc);

      const result = await service.findOne(docId, userId);
      expect(result).toEqual(mockDoc);
    });

    it('throws NotFoundException if the document does not exist', async () => {
      dbMock.query.documents.findFirst.mockResolvedValue(null);

      await expect(service.findOne(docId, userId)).rejects.toThrow(
        new NotFoundException('Document not found'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findOneWithVersions
  // -------------------------------------------------------------------------
  describe('findOneWithVersions', () => {
    const docId = 'doc-123';
    const userId = 'user-123';

    it('returns the document with its versions if found', async () => {
      const mockDoc = {
        id: docId,
        versions: [
          {
            versionNumber: 1,
            id: 'v1',
            storageKey: 'key1',
            changeSummary: 'Initial',
            createdAt: new Date(),
          },
        ],
      };
      dbMock.query.documents.findFirst.mockResolvedValue(mockDoc);

      const result = await service.findOneWithVersions(docId, userId);
      expect(result).toEqual(mockDoc);
    });

    it('throws NotFoundException if the document does not exist', async () => {
      dbMock.query.documents.findFirst.mockResolvedValue(null);

      await expect(service.findOneWithVersions(docId, userId)).rejects.toThrow(
        new NotFoundException('Document not found'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateTitle
  // -------------------------------------------------------------------------
  describe('updateTitle', () => {
    const docId = 'doc-123';
    const userId = 'user-123';

    it('successfully updates document title', async () => {
      const mockDoc = { id: docId, currentVersion: 1, mimeType: 'application/pdf' };
      dbMock.query.documents.findFirst.mockResolvedValue(mockDoc);

      // Mock update query chain
      const returningMock = jest.fn().mockResolvedValue([]);
      const updateWhereMock = jest.fn().mockReturnValue({ returning: returningMock });
      const setMock = jest.fn().mockReturnValue({ where: updateWhereMock });
      dbMock.update.mockReturnValue({ set: setMock });

      await service.updateTitle(docId, userId, { title: 'New Title' });

      expect(dbMock.update).toHaveBeenCalledWith(schema.documents);
      expect(setMock).toHaveBeenCalledWith({ title: 'New Title' });
    });
  });

  // -------------------------------------------------------------------------
  // removeVersion
  // -------------------------------------------------------------------------
  describe('removeVersion', () => {
    const docId = 'doc-123';
    const userId = 'user-123';

    it('successfully deletes a version from database and storage', async () => {
      const mockDoc = {
        id: docId,
        versions: [
          { id: 'v1-id', versionNumber: 1, storageKey: 'uploads/file1.pdf' },
          { id: 'v2-id', versionNumber: 2, storageKey: 'uploads/file2.pdf' },
        ],
      };
      dbMock.query.documents.findFirst.mockResolvedValue(mockDoc);

      const deleteWhereMock = jest.fn().mockResolvedValue([]);
      dbMock.delete.mockReturnValue({ where: deleteWhereMock });

      await service.removeVersion(docId, userId, 2);

      expect(dbMock.delete).toHaveBeenCalledWith(schema.documentVersions);
      expect(deleteWhereMock).toHaveBeenCalled();
      expect(storageServiceMock.deleteFile).toHaveBeenCalledWith(
        StorageFolderName.DOCUMENTS,
        'uploads/file2.pdf',
      );
    });

    it('throws NotFoundException if the document does not exist', async () => {
      dbMock.query.documents.findFirst.mockResolvedValue(null);

      await expect(service.removeVersion(docId, userId, 1)).rejects.toThrow(
        new NotFoundException('Document not found'),
      );
    });

    it('throws NotFoundException if the target version is not found in document versions', async () => {
      const mockDoc = {
        id: docId,
        versions: [{ id: 'v1-id', versionNumber: 1, storageKey: 'uploads/file1.pdf' }],
      };
      dbMock.query.documents.findFirst.mockResolvedValue(mockDoc);

      await expect(service.removeVersion(docId, userId, 99)).rejects.toThrow(
        new NotFoundException('Version not found'),
      );
    });
  });
});
