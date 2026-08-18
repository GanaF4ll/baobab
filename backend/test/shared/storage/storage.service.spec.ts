import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from 'src/shared/storage/storage.service';

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

  describe('deleteFile', () => {
    it('should extract relative key from full URL when calling DeleteObjectCommand', async () => {
      const fullUrl = 'http://localhost:9000/baobab-bucket/documents/37d79c00/1/file.md';
      await service.deleteFile(fullUrl);

      expect(service['s3'].send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'baobab-bucket',
            Key: 'documents/37d79c00/1/file.md',
          }),
        }),
      );
    });

    it('should pass relative key as is if not a full URL', async () => {
      const key = 'documents/37d79c00/1/file.md';
      await service.deleteFile(key);

      expect(service['s3'].send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'baobab-bucket',
            Key: 'documents/37d79c00/1/file.md',
          }),
        }),
      );
    });
  });

  describe('download', () => {
    it('should extract relative key from full URL when calling GetObjectCommand', async () => {
      (service['s3'].send as jest.Mock).mockResolvedValueOnce({
        Body: { transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])) },
      });

      const fullUrl = 'http://localhost:9000/baobab-bucket/documents/37d79c00/1/file.md';
      await service.download(fullUrl);

      expect(service['s3'].send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'baobab-bucket',
            Key: 'documents/37d79c00/1/file.md',
          }),
        }),
      );
    });
  });
});
