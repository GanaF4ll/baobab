import { Inject, Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { CreateConversationDto } from './dto/input/create-conversation.dto';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from '../drizzle/schema';
import { ConversationFilterDto } from './dto/input/conversation-filter.dto';
import { and, count, eq, ilike, isNull } from 'drizzle-orm';
import { CollectionResponseData } from 'src/shared/dto/output/api-collection-response.dto';
import { ConversationEntity } from './entities/conversation.entity';
import { UpdateConversationDto } from './dto/input/update-conversation.dto';
import { CreateMessageDto } from './dto/input/create-message.dto';
import {
  FindOneConversationResponseData,
  MessageResponseDto,
} from './dto/output/find-one-conversation-response.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  constructor(@Inject(DRIZZLE) private readonly drizzle: DrizzleDb) {}
  async create(
    createConversationDto: CreateConversationDto,
    userId: string,
  ): Promise<ConversationEntity> {
    const [conversation] = await this.drizzle
      .insert(schema.conversations)
      .values({
        workspaceId: createConversationDto.workspaceId,
        title: createConversationDto.title,
        userId,
      })
      .returning();
    return conversation;
  }

  async findAllByWorkspaceId(
    workspaceId: string,
    filter: ConversationFilterDto,
  ): Promise<CollectionResponseData<Omit<ConversationEntity, 'userId' | 'workspaceId'>>> {
    const { limit, cursor, order, search } = filter;
    const take = limit ?? 10;

    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorConv = await this.drizzle.query.conversations.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, cursor),
      });
      if (cursorConv) {
        cursorDate = cursorConv.createdAt;
      }
    }

    const [conversations, [{ countValue }]] = await Promise.all([
      this.drizzle.query.conversations.findMany({
        where: (conversations, { eq, and, ilike, gte, lte, ne }) =>
          and(
            eq(conversations.workspaceId, workspaceId),
            ...(search ? [ilike(conversations.title, `%${search}%`)] : []),
            ...(cursorDate
              ? order === 'desc'
                ? [lte(conversations.createdAt, cursorDate)]
                : [gte(conversations.createdAt, cursorDate)]
              : []),
            ...(cursor ? [ne(conversations.id, cursor)] : []),
            isNull(conversations.deletedAt),
          ),
        limit: take + 1,
        orderBy: (conversations, { desc, asc }) =>
          order === 'desc' ? desc(conversations.createdAt) : asc(conversations.createdAt),
        columns: {
          id: true,
          title: true,
          createdAt: true,
        },
      }),
      this.drizzle
        .select({ countValue: count() })
        .from(schema.conversations)
        .where(
          and(
            eq(schema.conversations.workspaceId, workspaceId),
            ...(search ? [ilike(schema.conversations.title, `%${search}%`)] : []),
          ),
        ),
    ]);

    const hasNextPage = conversations.length > take;
    const items = hasNextPage ? conversations.slice(0, take) : conversations;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return {
      items,
      totalCount: Number(countValue),
      nextCursor,
    };
  }

  async findOne(id: string, workspaceId: string): Promise<FindOneConversationResponseData> {
    const conversation = await this.drizzle.query.conversations.findFirst({
      where: (conversations, { eq, and }) =>
        and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)),
      with: {
        messages: {
          columns: {
            id: true,
            content: true,
            createdAt: true,
            role: true,
            sources: true,
          },
          orderBy: (messages, { desc }) => desc(messages.createdAt),
          limit: 20,
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async findNextMessages(
    conversationId: string,
    cursor?: string,
  ): Promise<{ items: MessageResponseDto[]; nextCursor: string | null; totalCount: number }> {
    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorMessage = await this.drizzle.query.messages.findFirst({
        where: (messages, { eq }) => eq(messages.id, cursor),
      });
      if (cursorMessage) {
        cursorDate = cursorMessage.createdAt;
      }
    }
    const [messages, [{ countValue }]] = await Promise.all([
      this.drizzle.query.messages.findMany({
        where: (messages, { eq, and, lte, ne }) =>
          and(
            eq(messages.conversationId, conversationId),
            ...(cursorDate ? [lte(messages.createdAt, cursorDate)] : []),
            ...(cursor ? [ne(messages.id, cursor)] : []),
          ),
        orderBy: (messages, { desc }) => desc(messages.createdAt),
        limit: 20,
        columns: {
          id: true,
          content: true,
          createdAt: true,
          role: true,
          sources: true,
        },
      }),
      this.drizzle
        .select({ countValue: count() })
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, conversationId)),
    ]);

    const hasNextPage = messages.length > 20;
    const items = hasNextPage ? messages.slice(0, 20) : messages;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return {
      items,
      totalCount: Number(countValue),
      nextCursor,
    };
  }

  async update(
    id: string,
    updateConversationDto: UpdateConversationDto,
    workspaceId: string,
  ): Promise<void> {
    const { title } = updateConversationDto;
    const existingConversation = await this.findOne(id, workspaceId);

    if (!existingConversation) {
      this.logger.error(`Conversation [${id}] not found `);
      throw new NotFoundException('Conversation not found');
    }

    if (existingConversation.deletedAt) {
      this.logger.error(`Conversation [${id}] already deleted `);
      throw new NotFoundException('Conversation not found');
    }

    await this.drizzle
      .update(schema.conversations)
      .set({ title })
      .where(
        and(eq(schema.conversations.id, id), eq(schema.conversations.workspaceId, workspaceId)),
      )
      .returning();
  }

  async softDelete(id: string, workspaceId: string) {
    const existingConversation = await this.findOne(id, workspaceId);
    if (!existingConversation) {
      this.logger.error(`Conversation [${id}] not found `);
      throw new NotFoundException('Conversation not found');
    }
    if (existingConversation.deletedAt) {
      this.logger.error(`Conversation [${id}] already deleted `);
      throw new BadRequestException('Conversation already deleted');
    }
    const [deletedConversation] = await this.drizzle
      .update(schema.conversations)
      .set({ deletedAt: new Date() })
      .where(eq(schema.conversations.id, id))
      .returning();
    return deletedConversation;
  }

  async restore(id: string, workspaceId: string): Promise<ConversationEntity> {
    const existingConversation = await this.findOne(id, workspaceId);
    if (!existingConversation) {
      this.logger.error(`Conversation [${id}] not found `);
      throw new NotFoundException('Conversation not found');
    }
    console.log('existingConversation', existingConversation);
    if (!existingConversation.deletedAt) {
      this.logger.error(`Conversation [${id}] not deleted `);
      throw new BadRequestException('Conversation not deleted');
    }
    const [restoredConversation] = await this.drizzle
      .update(schema.conversations)
      .set({ deletedAt: null })
      .where(eq(schema.conversations.id, id))
      .returning();
    return restoredConversation;
  }

  async saveMessage(
    conversationId: string,
    dto: CreateMessageDto,
    workspaceId: string,
  ): Promise<void> {
    await this.findOne(conversationId, workspaceId);
    await this.drizzle.insert(schema.messages).values({
      conversationId,
      role: dto.role,
      content: dto.content,
      sources: dto.sources,
    });

    this.logger.debug(`Saved a message from [${dto.role}] for conversation [${conversationId}]`);
  }
}
