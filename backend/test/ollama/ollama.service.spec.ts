import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OllamaService } from 'src/ollama/ollama.service';

describe('OllamaService', () => {
  let service: OllamaService;
  let _configService: ConfigService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    fetchSpy = jest.spyOn(global, 'fetch');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OLLAMA_URL') return 'http://mock-ollama:11434';
              if (key === 'OLLAMA_EMBED_MODEL') return 'mock-embed-model';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OllamaService>(OllamaService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Initialization', () => {
    it('should use values from ConfigService when provided', () => {
      expect((service as any).ollamaUrl).toBe('http://mock-ollama:11434');
      expect((service as any).embeddingModel).toBe('mock-embed-model');
    });

    it('should fall back to defaults when ConfigService returns null/undefined', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OllamaService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const defaultService = module.get<OllamaService>(OllamaService);
      expect((defaultService as any).ollamaUrl).toBe('http://localhost:11434');
      expect((defaultService as any).embeddingModel).toBe('nomic-embed-text');
    });
  });

  describe('generateEmbeddings', () => {
    const mockEmbeddings = [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ];

    it('should call fetch with correct URL, method, headers and body, and return embeddings', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ embeddings: mockEmbeddings }),
      } as any);

      const inputTexts = ['chunk 1', 'chunk 2'];
      const result = await service.generateEmbeddings(inputTexts);

      expect(fetchSpy).toHaveBeenCalledWith('http://mock-ollama:11434/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-embed-model',
          input: inputTexts,
        }),
      });
      expect(result).toEqual(mockEmbeddings);
    });

    it('should throw HttpException with HttpStatus.INTERNAL_SERVER_ERROR if fetch fails', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const inputTexts = ['chunk 1'];
      await expect(service.generateEmbeddings(inputTexts)).rejects.toThrow(
        new HttpException(
          'Erreur lors de la génération des embeddings',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should throw HttpException with HttpStatus.INTERNAL_SERVER_ERROR if response is not ok', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      } as any);

      const inputTexts = ['chunk 1'];
      await expect(service.generateEmbeddings(inputTexts)).rejects.toThrow(
        new HttpException(
          'Erreur lors de la génération des embeddings',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
