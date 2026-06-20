import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from 'src/conversations/conversations.controller';
import { ConversationsService } from 'src/conversations/conversations.service';
import { RagService } from 'src/rag/rag.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { WorkspaceMemberGuard } from 'src/workspaces/guards/workspace-member.guard';
import { NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

const mockConversation = {
  id: 'conv-uuid-1',
  workspaceId: 'ws-uuid-1',
  title: 'Test Conversation',
  userId: 'user-uuid-1',
  createdAt: new Date('2026-06-19T12:00:00Z'),
  deletedAt: null as Date | null,
};

const mockMessage = {
  id: 'msg-uuid-1',
  conversationId: 'conv-uuid-1',
  content: 'Hello World',
  role: 'user' as const,
  sources: null as string[] | null,
  createdAt: new Date('2026-06-19T12:05:00Z'),
};

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let conversationsService: jest.Mocked<ConversationsService>;
  let ragService: jest.Mocked<RagService>;

  beforeEach(async () => {
    conversationsService = {
      create: jest.fn(),
      findAllByWorkspaceId: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      saveMessage: jest.fn(),
      findNextMessages: jest.fn(),
    } as any;

    ragService = {
      searchSimilarChunks: jest.fn(),
      generateResponseStream: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: conversationsService,
        },
        {
          provide: RagService,
          useValue: ragService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return wrapped conversation', async () => {
      const dto = { title: 'New Conv', workspaceId: 'ws-1' };
      conversationsService.create.mockResolvedValue(mockConversation as any);

      const result = await controller.create(dto, 'user-1');

      expect(conversationsService.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual({ data: mockConversation });
    });
  });

  describe('ask', () => {
    let mockRes: any;
    beforeEach(() => {
      mockRes = {
        raw: {
          setHeader: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
        },
      };
    });

    it('should set headers, save user message, write chunks to raw response, save assistant message on complete and close response', async () => {
      const askDto = { question: 'What is Baobab?', versionIds: ['v1'] };
      const chunks = [{ versionId: 'v1' }];
      ragService.searchSimilarChunks.mockResolvedValue(chunks as any);
      ragService.generateResponseStream.mockResolvedValue(
        of({ data: { content: 'Baobab ' } }, { data: { content: 'is a tree.' } }) as any,
      );

      await controller.ask(askDto, mockRes, 'conv-1', 'ws-1');

      expect(mockRes.raw.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(conversationsService.saveMessage).toHaveBeenNthCalledWith(
        1,
        'conv-1',
        { content: 'What is Baobab?', role: 'user' },
        'ws-1',
      );
      expect(ragService.searchSimilarChunks).toHaveBeenCalledWith('What is Baobab?', ['v1']);
      expect(ragService.generateResponseStream).toHaveBeenCalledWith('What is Baobab?', chunks);

      expect(mockRes.raw.write).toHaveBeenNthCalledWith(1, 'data: {"content":"Baobab "}\n\n');
      expect(mockRes.raw.write).toHaveBeenNthCalledWith(2, 'data: {"content":"is a tree."}\n\n');

      expect(conversationsService.saveMessage).toHaveBeenNthCalledWith(
        2,
        'conv-1',
        { content: 'Baobab is a tree.', role: 'assistant', sources: ['v1'] },
        'ws-1',
      );
      expect(mockRes.raw.end).toHaveBeenCalled();
    });

    it('should handle errors in the stream correctly', async () => {
      const askDto = { question: 'Error trigger', versionIds: [] };
      ragService.searchSimilarChunks.mockResolvedValue([]);
      ragService.generateResponseStream.mockResolvedValue(
        throwError(() => new Error('Ollama error')) as any,
      );

      await controller.ask(askDto, mockRes, 'conv-1', 'ws-1');

      expect(mockRes.raw.write).toHaveBeenCalledWith('data: {"error": "Stream failed"}\n\n');
      expect(mockRes.raw.end).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should call service.restore and return wrapped conversation', async () => {
      conversationsService.restore.mockResolvedValue(mockConversation as any);

      const result = await controller.restore('conv-1', 'ws-1');

      expect(conversationsService.restore).toHaveBeenCalledWith('conv-1', 'ws-1');
      expect(result).toEqual({ data: mockConversation });
    });
  });

  describe('findAll', () => {
    it('should call service.findAllByWorkspaceId and return lists', async () => {
      const serviceResult = { items: [mockConversation], totalCount: 1, nextCursor: null };
      conversationsService.findAllByWorkspaceId.mockResolvedValue(serviceResult as any);

      const result = await controller.findAll('ws-1', { limit: 10 });

      expect(conversationsService.findAllByWorkspaceId).toHaveBeenCalledWith('ws-1', { limit: 10 });
      expect(result).toEqual({ data: serviceResult });
    });
  });

  describe('findOne', () => {
    it('should return conversation if found and not deleted', async () => {
      conversationsService.findOne.mockResolvedValue(mockConversation as any);

      const result = await controller.findOne('conv-1', 'ws-1');

      expect(conversationsService.findOne).toHaveBeenCalledWith('conv-1', 'ws-1');
      expect(result).toEqual({ data: mockConversation });
    });

    it('should throw NotFoundException if conversation is soft deleted', async () => {
      conversationsService.findOne.mockResolvedValue({
        ...mockConversation,
        deletedAt: new Date(),
      } as any);

      await expect(controller.findOne('conv-1', 'ws-1')).rejects.toThrow(
        new NotFoundException('Conversation not found'),
      );
    });

    it('should propagate NotFoundException if conversation not found (service throws)', async () => {
      conversationsService.findOne.mockRejectedValue(new NotFoundException('Conversation not found'));

      await expect(controller.findOne('conv-1', 'ws-1')).rejects.toThrow(
        new NotFoundException('Conversation not found'),
      );
    });
  });

  describe('findNextMessages', () => {
    it('should call service.findNextMessages and return messages list', async () => {
      const serviceResult = { items: [mockMessage], totalCount: 1, nextCursor: null };
      conversationsService.findNextMessages.mockResolvedValue(serviceResult as any);

      const result = await controller.findNextMessages('conv-1', { cursor: 'msg-1' });

      expect(conversationsService.findNextMessages).toHaveBeenCalledWith('conv-1', 'msg-1');
      expect(result).toEqual({ data: serviceResult });
    });
  });

  describe('update', () => {
    it('should call service.update and return its result', async () => {
      conversationsService.update.mockResolvedValue(undefined);

      const result = await controller.update('conv-1', { title: 'New Title' }, 'ws-1');

      expect(conversationsService.update).toHaveBeenCalledWith('conv-1', { title: 'New Title' }, 'ws-1');
      expect(result).toBeUndefined();
    });
  });

  describe('softDelete', () => {
    it('should call service.softDelete and return its result', async () => {
      conversationsService.softDelete.mockResolvedValue(mockConversation as any);

      const result = await controller.softDelete('conv-1', 'ws-1');

      expect(conversationsService.softDelete).toHaveBeenCalledWith('conv-1', 'ws-1');
      expect(result).toEqual(mockConversation);
    });
  });
});
