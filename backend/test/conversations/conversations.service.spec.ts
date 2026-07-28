import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from 'src/conversations/conversations.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';

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

const buildDbMock = () => {
  const insertReturningMock = jest.fn().mockResolvedValue([mockConversation]);
  const insertValuesMock = jest.fn().mockReturnValue({ returning: insertReturningMock });
  const insertValuesNoReturningMock = jest.fn().mockResolvedValue({});
  const insertMock = jest.fn().mockImplementation((table) => {
    if (table === schema.messages) {
      return { values: insertValuesNoReturningMock };
    }
    return { values: insertValuesMock };
  });

  const updateReturningMock = jest.fn().mockResolvedValue([mockConversation]);
  const updateWhereMock = jest.fn().mockReturnValue({ returning: updateReturningMock });
  const updateSetMock = jest.fn().mockReturnValue({ where: updateWhereMock });
  const updateMock = jest.fn().mockReturnValue({ set: updateSetMock });

  const countWhereMock = jest.fn().mockResolvedValue([{ countValue: 1 }]);
  const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
  const selectMock = jest.fn().mockReturnValue({ from: countFromMock });

  return {
    insert: insertMock,
    update: updateMock,
    select: selectMock,
    query: {
      conversations: {
        findFirst: jest.fn().mockResolvedValue(mockConversation),
        findMany: jest.fn().mockResolvedValue([mockConversation]),
      },
      messages: {
        findFirst: jest.fn().mockResolvedValue(mockMessage),
        findMany: jest.fn().mockResolvedValue([mockMessage]),
      },
    },
  };
};

describe('ConversationsService', () => {
  let service: ConversationsService;
  let db: ReturnType<typeof buildDbMock>;

  beforeEach(async () => {
    db = buildDbMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: DRIZZLE,
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should insert a new conversation and return it', async () => {
      const dto = { title: 'New Conversation', workspaceId: 'ws-uuid-1' };
      const result = await service.create(dto, 'user-uuid-1');

      expect(db.insert).toHaveBeenCalledWith(schema.conversations);
      expect(result).toEqual(mockConversation);
    });
  });

  describe('findAllByWorkspaceId', () => {
    it('should return paginated conversations with default settings', async () => {
      const result = await service.findAllByWorkspaceId('ws-uuid-1', {});

      expect(db.query.conversations.findMany).toHaveBeenCalled();
      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual({
        items: [mockConversation],
        totalCount: 1,
        nextCursor: null,
      });
    });

    it('should handle search filter and custom limit', async () => {
      await service.findAllByWorkspaceId('ws-uuid-1', {
        search: 'test',
        limit: 5,
      });

      expect(db.query.conversations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 6,
        }),
      );
    });

    it('should retrieve cursor date if cursor is provided', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

      await service.findAllByWorkspaceId('ws-uuid-1', {
        cursor: 'conv-uuid-1',
      });

      expect(db.query.conversations.findFirst).toHaveBeenCalled();
      expect(db.query.conversations.findMany).toHaveBeenCalled();
    });

    it('should determine hasNextPage and set nextCursor correctly when items count is greater than limit', async () => {
      const conv1 = { ...mockConversation, id: 'c1' };
      const conv2 = { ...mockConversation, id: 'c2' };
      db.query.conversations.findMany.mockResolvedValueOnce([conv1, conv2]);

      const result = await service.findAllByWorkspaceId('ws-uuid-1', {
        limit: 1,
      });

      expect(result).toEqual({
        items: [conv1],
        totalCount: 1,
        nextCursor: 'c1',
      });
    });
  });

  describe('findOne', () => {
    it('should return a conversation when found', async () => {
      const result = await service.findOne('conv-uuid-1', 'ws-uuid-1');
      expect(db.query.conversations.findFirst).toHaveBeenCalled();
      expect(result).toEqual(mockConversation);
    });

    it('should throw NotFoundException when no conversation matches the id', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne('unknown-id', 'ws-uuid-1')).rejects.toThrow(
        new NotFoundException('Conversation not found'),
      );
    });
  });

  describe('findNextMessages', () => {
    it('should return next messages for a conversation without a cursor', async () => {
      const result = await service.findNextMessages('conv-uuid-1');

      expect(db.query.messages.findMany).toHaveBeenCalled();
      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual({
        items: [mockMessage],
        totalCount: 1,
        nextCursor: null,
      });
    });

    it('should fetch cursor message date if cursor is provided', async () => {
      db.query.messages.findFirst.mockResolvedValueOnce(mockMessage);

      await service.findNextMessages('conv-uuid-1', 'msg-uuid-1');

      expect(db.query.messages.findFirst).toHaveBeenCalled();
      expect(db.query.messages.findMany).toHaveBeenCalled();
    });

    it('should slice items and return nextCursor when page has next page', async () => {
      const testMessages = Array.from({ length: 22 }, (_, idx) => ({
        ...mockMessage,
        id: `msg-uuid-${idx}`,
      }));
      db.query.messages.findMany.mockResolvedValueOnce(testMessages);

      const result = await service.findNextMessages('conv-uuid-1');

      expect(result.items.length).toBe(20);
      expect(result.nextCursor).toBe('msg-uuid-19');
    });
  });

  describe('update', () => {
    it('should successfully update title', async () => {
      await service.update('conv-uuid-1', { title: 'Updated Title' }, 'ws-uuid-1');

      expect(db.update).toHaveBeenCalledWith(schema.conversations);
    });

    it('should throw NotFoundException if conversation to update is not found', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update('conv-uuid-1', { title: 'Updated Title' }, 'ws-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if conversation is already deleted', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce({
        ...mockConversation,
        deletedAt: new Date(),
      });

      await expect(
        service.update('conv-uuid-1', { title: 'Updated Title' }, 'ws-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should successfully soft delete conversation', async () => {
      const result = await service.softDelete('conv-uuid-1', 'ws-uuid-1');

      expect(db.update).toHaveBeenCalledWith(schema.conversations);
      expect(result).toEqual(mockConversation);
    });

    it('should throw NotFoundException if conversation to delete is not found', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce(null);

      await expect(service.softDelete('conv-uuid-1', 'ws-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if conversation is already soft deleted', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce({
        ...mockConversation,
        deletedAt: new Date(),
      });

      await expect(service.softDelete('conv-uuid-1', 'ws-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('restore', () => {
    it('should successfully restore a deleted conversation', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce({
        ...mockConversation,
        deletedAt: new Date(),
      });

      const result = await service.restore('conv-uuid-1', 'ws-uuid-1');

      expect(db.update).toHaveBeenCalledWith(schema.conversations);
      expect(result).toEqual(mockConversation);
    });

    it('should throw NotFoundException if conversation to restore is not found', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce(null);

      await expect(service.restore('conv-uuid-1', 'ws-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if conversation is not deleted', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce({
        ...mockConversation,
        deletedAt: null,
      });

      await expect(service.restore('conv-uuid-1', 'ws-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('saveMessage', () => {
    it('should verify conversation exists and then insert the message', async () => {
      const dto = {
        role: 'user' as const,
        content: 'Testing saveMessage',
      };

      await service.saveMessage('conv-uuid-1', dto, 'ws-uuid-1');

      expect(db.query.conversations.findFirst).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalledWith(schema.messages);
    });
  });
});
