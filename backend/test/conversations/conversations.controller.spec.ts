import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from 'src/conversations/conversations.controller';
import { ConversationsService } from 'src/conversations/conversations.service';
import { RagService } from 'src/rag/rag.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        ConversationsService,
        {
          provide: RagService,
          useValue: {
            searchSimilarChunks: jest.fn(),
            generateResponseStream: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
