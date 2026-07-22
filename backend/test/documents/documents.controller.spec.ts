import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from 'src/documents/documents.controller';
import { DocumentsService } from 'src/documents/documents.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { WorkspaceMemberGuard } from 'src/workspaces/guards/workspace-member.guard';
import { UpdateDocumentTitleDto } from 'src/documents/dto/input/update-document-title.dto';
import { DocumentFilterDto } from 'src/documents/dto/input/document-filter.dto';
import { DeleteVersionDto } from 'src/documents/dto/input/delete-version.dto';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let serviceMock: jest.Mocked<DocumentsService>;

  beforeEach(async () => {
    serviceMock = {
      create: jest.fn(),
      findAllByWorkspace: jest.fn(),
      findOne: jest.fn(),
      findOneWithVersions: jest.fn(),
      updateTitle: jest.fn(),
      removeVersion: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('calls service.create with the first incoming file from request', async () => {
      const mockFile = { buffer: Buffer.from('test'), mimetype: 'application/pdf', originalname: 'test.pdf' } as any;
      const request = { incomingFiles: [mockFile] } as any;
      const workspaceId = 'workspace-123';
      const dto = { workspaceId } as any;
      serviceMock.create.mockReturnValue('Mocked response' as any);

      const result = await controller.create(request, 'debug-user-id', dto);

      expect(serviceMock.create).toHaveBeenCalledWith('debug-user-id', mockFile, workspaceId, undefined);
      expect(result).toEqual({ data: 'Mocked response' });
    });

    it('calls service.create with documentId when provided', async () => {
      const mockFile = { buffer: Buffer.from('test'), mimetype: 'application/pdf', originalname: 'test.pdf' } as any;
      const request = { incomingFiles: [mockFile] } as any;
      const workspaceId = 'workspace-123';
      const docId = 'doc-123';
      const dto = { workspaceId, id: docId } as any;
      serviceMock.create.mockReturnValue('Mocked response' as any);

      const result = await controller.create(request, 'debug-user-id', dto);

      expect(serviceMock.create).toHaveBeenCalledWith('debug-user-id', mockFile, workspaceId, docId);
      expect(result).toEqual({ data: 'Mocked response' });
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAllByWorkspace', () => {
    it('calls service.findAllByWorkspace with userId, workspaceId and filters, returns formatted collection response', async () => {
      const userId = 'user-123';
      const workspaceId = 'workspace-123';
      const filters: DocumentFilterDto = { limit: 10 } as any;
      const serviceResult = { items: [], totalCount: 0, nextCursor: null };
      serviceMock.findAllByWorkspace.mockResolvedValue(serviceResult);

      const result = await controller.findAllByWorkspace(workspaceId, userId, filters);

      expect(serviceMock.findAllByWorkspace).toHaveBeenCalledWith(userId, workspaceId, filters);
      expect(result).toEqual({
        data: serviceResult,
      });
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    it('calls service.findOneWithVersions with id and userId, returns formatted response', async () => {
      const id = 'doc-123';
      const userId = 'user-123';
      const serviceResult = { id, versions: [] } as any;
      serviceMock.findOneWithVersions.mockResolvedValue(serviceResult);

      const result = await controller.findOne(id, userId);

      expect(serviceMock.findOneWithVersions).toHaveBeenCalledWith(id, userId);
      expect(result).toEqual({
        data: serviceResult,
      });
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('calls service.updateTitle with id, userId and update dto', async () => {
      const id = 'doc-123';
      const userId = 'user-123';
      const dto: UpdateDocumentTitleDto = { title: 'New Title' };
      serviceMock.updateTitle.mockResolvedValue(undefined);

      await controller.update(id, userId, dto);

      expect(serviceMock.updateTitle).toHaveBeenCalledWith(id, userId, dto);
    });
  });

  // -------------------------------------------------------------------------
  // removeVersion
  // -------------------------------------------------------------------------
  describe('removeVersion', () => {
    it('calls service.removeVersion with documentId, userId, versionId and workspaceId from Dto', async () => {
      const userId = 'user-123';
      const dto: DeleteVersionDto = {
        id: 'version-123',
        documentId: 'doc-123',
        workspaceId: 'workspace-123',
      };
      serviceMock.removeVersion.mockResolvedValue(undefined);

      await controller.removeVersion(dto, userId);

      expect(serviceMock.removeVersion).toHaveBeenCalledWith(dto.documentId, userId, dto.id, dto.workspaceId);
    });
  });
});
