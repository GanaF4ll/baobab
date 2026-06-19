import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { RagModule } from 'src/rag/rag.module';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService],
  imports: [RagModule],
})
export class ConversationsModule {}
