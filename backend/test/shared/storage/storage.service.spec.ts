import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from 'src/shared/storage/storage.service';
import { ConfigService } from '@nestjs/config';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockImplementation((key: string) => {
              if (key === 'MINIO_ROOT_USER') return 'minioadmin';
              if (key === 'MINIO_ROOT_PASSWORD') return 'minioadmin';
              if (key === 'MINIO_ENDPOINT') return 'http://localhost:9000';
              if (key === 'MINIO_BUCKET') return 'baobab-bucket';
              return 'test';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    // Mock the S3 client send method to avoid real network calls
    service['s3'].send = jest.fn().mockResolvedValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
