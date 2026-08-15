import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { OrderFilter } from 'src/shared/constants';
import { CollectionResponseData } from 'src/shared/dto/output/api-collection-response.dto';
import { RessouceType, TrashFilterDto } from 'src/trash/dto/input/trash-filter.dto';
import { TrashItemDto } from 'src/trash/dto/output/trash-response.dto';
import { TrashController } from 'src/trash/trash.controller';
import { TrashService } from 'src/trash/trash.service';

const mockTrashItem: TrashItemDto = {
  id: 'item-uuid-1',
  type: 'document',
  title: 'Deleted Doc',
  deletedAt: new Date('2026-08-10T10:00:00Z').toISOString(),
  expiresAt: new Date('2026-09-09T10:00:00Z').toISOString(),
  workspaceId: 'ws-uuid-1',
  workspaceName: 'Test Workspace',
  metadata: {
    mimeType: 'application/pdf',
  },
};

const mockCollectionData: CollectionResponseData<TrashItemDto> = {
  items: [mockTrashItem],
  totalCount: 1,
  nextCursor: null,
};

describe('TrashController', () => {
  let controller: TrashController;
  let trashService: jest.Mocked<TrashService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrashController],
      providers: [
        {
          provide: TrashService,
          useValue: {
            findAll: jest.fn().mockResolvedValue(mockCollectionData),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TrashController>(TrashController);
    trashService = module.get(TrashService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call trashService.findAll and return enveloped collection data with totalCount and nextCursor', async () => {
      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {
        limit: 10,
        offset: 0,
        search: 'Deleted',
        ressourceType: [RessouceType.Document],
        order: OrderFilter.DESC,
      };

      const result = await controller.findAll(userId, filters);

      expect(trashService.findAll).toHaveBeenCalledTimes(1);
      expect(trashService.findAll).toHaveBeenCalledWith(userId, filters);
      expect(result).toEqual({
        data: {
          items: [mockTrashItem],
          totalCount: 1,
          nextCursor: null,
        },
      });
    });

    it('should pass filters when calling findAll', async () => {
      const userId = 'user-uuid-1';
      const filters: TrashFilterDto = {};

      const result = await controller.findAll(userId, filters);

      expect(trashService.findAll).toHaveBeenCalledTimes(1);
      expect(trashService.findAll).toHaveBeenCalledWith(userId, filters);
      expect(result).toEqual({
        data: mockCollectionData,
      });
    });
  });
});
