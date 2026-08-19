import { PickType } from '@nestjs/swagger';
import { ConversationEntity } from 'src/conversations/entities/conversation.entity';

export class CreateConversationDto extends PickType(ConversationEntity, ['title', 'workspaceId']) {}
