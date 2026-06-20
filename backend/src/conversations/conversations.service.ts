import { Inject, Injectable } from '@nestjs/common';
import { CreateConversationDto } from './dto/input/create-conversation.dto';
import { UpdateConversationDto } from './dto/input/update-conversation.dto';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from '../drizzle/schema';

@Injectable()
export class ConversationsService {
  constructor(@Inject(DRIZZLE) private readonly drizzle: DrizzleDb) {}
  async create(createConversationDto: CreateConversationDto, userId: string) {
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

  findAll() {
    return `This action returns all conversations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} conversation`;
  }

  update(id: number, updateConversationDto: UpdateConversationDto) {
    return `This action updates a #${id} conversation`;
  }

  remove(id: number) {
    return `This action removes a #${id} conversation`;
  }
}
