import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { StorageService } from 'src/shared/storage/storage.service';
import { TrashService } from 'src/trash/trash.service';

describe('TrashService', () => {
  let service: TrashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrashService,
        {
          provide: DRIZZLE,
          useValue: {},
        },
        {
          provide: StorageService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TrashService>(TrashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
