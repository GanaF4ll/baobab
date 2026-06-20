import { OmitType } from '@nestjs/swagger';
import { ConversationEntity } from 'src/conversations/entities/conversation.entity';
import { toApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';

export class ConversationCollectionData extends OmitType(ConversationEntity, [
  'userId',
  'workspaceId',
]) {}

export const ConversationCollectionResponseDto = toApiCollectionResponseDto(
  ConversationCollectionData,
);
