import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from 'src/documents/documents.controller';
import { DocumentsService } from 'src/documents/documents.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CreateDocumentDto } from 'src/documents/dto/input/create-document.dto';
import { UpdateDocumentTitleDto } from 'src/documents/dto/input/update-document-title.dto';
import { DocumentFilterDto } from 'src/documents/dto/input/document-filter.dto';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let serviceMock: jest.Mocked<DocumentsService>;

  beforeEach(async () => {
    serviceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
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
    it('calls service.create with CreateDocumentDto', async () => {
      const dto: CreateDocumentDto = {} as any;
      serviceMock.create.mockReturnValue('Mocked response' as any);

      const result = await controller.create(dto);

      expect(serviceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toBe('Mocked response');
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('calls service.findAll with userId and filters, returns formatted collection response', async () => {
      const userId = 'user-123';
      const filters: DocumentFilterDto = { limit: 10 } as any;
      const serviceResult = { items: [], totalCount: 0, nextCursor: null };
      serviceMock.findAll.mockResolvedValue(serviceResult);

      const result = await controller.findAll(userId, filters);

      expect(serviceMock.findAll).toHaveBeenCalledWith(userId, filters);
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
    it('calls service.removeVersion with id, userId and parsed numeric version number', async () => {
      const id = 'doc-123';
      const userId = 'user-123';
      const versionNumberString = '2';
      serviceMock.removeVersion.mockResolvedValue(undefined);

      await controller.removeVersion(id, versionNumberString, userId);

      expect(serviceMock.removeVersion).toHaveBeenCalledWith(id, userId, 2);
    });
  });
});
