import { Test, TestingModule } from '@nestjs/testing';
import { RagController } from '../../src/rag/rag.controller';
import { RagService } from '../../src/rag/rag.service';

describe('RagController', () => {
  let controller: RagController;
  let ragServiceMock: any;

  beforeEach(async () => {
    ragServiceMock = {
      searchSimilarChunks: jest.fn(),
      generateResponseStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagController],
      providers: [
        {
          provide: RagService,
          useValue: ragServiceMock,
        },
      ],
    }).compile();

    controller = module.get<RagController>(RagController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

