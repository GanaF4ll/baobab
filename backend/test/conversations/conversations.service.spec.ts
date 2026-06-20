import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from 'src/conversations/conversations.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';

describe('ConversationsService', () => {
  let service: ConversationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: DRIZZLE,
          useValue: {
            insert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
