import { Test, TestingModule } from '@nestjs/testing';
import { TrashService } from 'src/trash/services/trash.service';
import { TrashCronService } from 'src/trash/services/trash-cron.service';

describe('TrashCronService', () => {
  let cronService: TrashCronService;
  let trashServiceMock: jest.Mocked<Partial<TrashService>>;

  beforeEach(async () => {
    trashServiceMock = {
      purgeAllRessourcesMarkedForDeletion: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrashCronService,
        {
          provide: TrashService,
          useValue: trashServiceMock,
        },
      ],
    }).compile();

    cronService = module.get<TrashCronService>(TrashCronService);
  });

  it('should be defined', () => {
    expect(cronService).toBeDefined();
  });

  describe('removeSoftDeleted', () => {
    it('should call purgeAllRessourcesMarkedForDeletion on TrashService', async () => {
      await cronService.removeSoftDeleted();

      expect(trashServiceMock.purgeAllRessourcesMarkedForDeletion).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if purgeAllRessourcesMarkedForDeletion fails', async () => {
      const error = new Error('Database connection failed');
      (trashServiceMock.purgeAllRessourcesMarkedForDeletion as jest.Mock).mockRejectedValueOnce(
        error,
      );

      await expect(cronService.removeSoftDeleted()).rejects.toThrow('Database connection failed');
    });
  });
});
