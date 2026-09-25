import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from 'src/documents/documents.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { OllamaService } from 'src/ollama/ollama.service';
import { RagService } from '../../src/rag/rag.service';

describe('RagService', () => {
  let service: RagService;
  let dbMock: any;
  let ollamaServiceMock: any;
  let documentsServiceMock: any;

  beforeEach(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };

    ollamaServiceMock = {
      generateSingleEmbedding: jest.fn(),
    };

    documentsServiceMock = {
      ensureChunksExist: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
        {
          provide: OllamaService,
          useValue: ollamaServiceMock,
        },
        {
          provide: DocumentsService,
          useValue: documentsServiceMock,
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchSimilarChunks', () => {
    const mockQuestion = 'What is baobab?';
    const mockEmbedding = Array(768).fill(0.1);

    it('should return empty array if documentIds is undefined, null, or empty', async () => {
      expect(await service.searchSimilarChunks(mockQuestion, null as any)).toEqual([]);
      expect(await service.searchSimilarChunks(mockQuestion, undefined as any)).toEqual([]);
      expect(await service.searchSimilarChunks(mockQuestion, [])).toEqual([]);

      expect(ollamaServiceMock.generateSingleEmbedding).not.toHaveBeenCalled();
      expect(dbMock.select).not.toHaveBeenCalled();
    });

    it('should vectorize question and search database for similar chunks', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const topK = 3;
      const mockResults = [
        {
          id: 'chunk-1',
          documentId: 'doc-1',
          content: 'chunk content 1',
          chunkIndex: 0,
          distance: 0.1,
        },
        {
          id: 'chunk-2',
          documentId: 'doc-2',
          content: 'chunk content 2',
          chunkIndex: 1,
          distance: 0.2,
        },
      ];

      ollamaServiceMock.generateSingleEmbedding.mockResolvedValue(mockEmbedding);
      dbMock.limit.mockResolvedValue(mockResults);

      const result = await service.searchSimilarChunks(mockQuestion, documentIds, topK);

      expect(ollamaServiceMock.generateSingleEmbedding).toHaveBeenCalledWith(mockQuestion);
      expect(dbMock.select).toHaveBeenCalled();
      expect(dbMock.from).toHaveBeenCalledWith(schema.chunks);
      expect(dbMock.where).toHaveBeenCalled();
      expect(dbMock.orderBy).toHaveBeenCalled();
      expect(dbMock.limit).toHaveBeenCalledWith(topK);
      expect(result).toEqual(mockResults);
    });

    it('should default topK to 4 if not provided', async () => {
      const documentIds = ['doc-1'];
      ollamaServiceMock.generateSingleEmbedding.mockResolvedValue(mockEmbedding);
      dbMock.limit.mockResolvedValue([]);

      await service.searchSimilarChunks(mockQuestion, documentIds);

      expect(dbMock.limit).toHaveBeenCalledWith(4);
    });
  });

  describe('contextualizeQuery', () => {
    it('should return raw question if history is empty', async () => {
      const result = await service.contextualizeQuery('What is baobab?', []);
      expect(result).toBe('What is baobab?');
      expect(ollamaServiceMock.chat).toBeUndefined();
    });

    it('should call ollamaService.chat to reformulate query when history is provided', async () => {
      ollamaServiceMock.getRewriteModel = jest.fn().mockReturnValue('mistral:7b');
      ollamaServiceMock.chat = jest.fn().mockResolvedValue({
        message: { content: 'Tell me about baobab tree characteristics' },
      });

      const history = [
        { role: 'user' as const, content: 'What is a baobab?' },
        { role: 'assistant' as const, content: 'A baobab is a tree.' },
      ];

      const result = await service.contextualizeQuery('What are its characteristics?', history);

      expect(result).toBe('Tell me about baobab tree characteristics');
      expect(ollamaServiceMock.chat).toHaveBeenCalled();
    });

    it('should fallback to raw question if ollama chat fails', async () => {
      ollamaServiceMock.getRewriteModel = jest.fn().mockReturnValue('mistral:7b');
      ollamaServiceMock.chat = jest.fn().mockRejectedValue(new Error('LLM error'));

      const history = [{ role: 'user' as const, content: 'Hello' }];
      const result = await service.contextualizeQuery('Tell me more', history);

      expect(result).toBe('Tell me more');
    });
  });

  describe('generateResponseStream', () => {
    it('should assemble system instructions, history and question into streamChat', async () => {
      const { of } = await import('rxjs');
      ollamaServiceMock.streamChat = jest
        .fn()
        .mockReturnValue(
          of(
            { message: { content: 'Hello' }, done: false },
            { message: { content: ' world' }, done: true },
          ),
        );

      const history = [{ role: 'user' as const, content: 'Hi' }];
      const chunks = [{ chunkIndex: 0, versionId: 'v1', content: 'Doc content' }];

      const stream$ = await service.generateResponseStream('How are you?', chunks, history);
      const results: any[] = [];
      stream$.subscribe((val) => results.push(val));

      expect(ollamaServiceMock.streamChat).toHaveBeenCalled();
      const calledMessages = ollamaServiceMock.streamChat.mock.calls[0][0];
      expect(calledMessages[0].role).toBe('system');
      expect(calledMessages[1]).toEqual({ role: 'user', content: 'Hi' });
      expect(calledMessages[2]).toEqual({ role: 'user', content: 'How are you?' });
      expect(results).toHaveLength(2);
    });
  });
});
