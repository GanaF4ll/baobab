import { Module } from '@nestjs/common';
import { RagModule } from 'src/rag/rag.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService],
  imports: [RagModule],
})
export class ConversationsModule {}
