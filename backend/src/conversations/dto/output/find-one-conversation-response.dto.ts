import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConversationEntity } from 'src/conversations/entities/conversation.entity';
import { MessageEntity } from 'src/conversations/entities/message.entity';
import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';

export class MessageResponseDto extends PickType(MessageEntity, [
  'id',
  'content',
  'role',
  'sources',
  'createdAt',
]) {}

export class FindOneConversationResponseData extends ConversationEntity {
  @Type(() => MessageResponseDto)
  messages: MessageResponseDto[];
}

export class FindOneConversationResponseDto extends ApiResponseDto<FindOneConversationResponseData> {
  @ApiProperty({ type: FindOneConversationResponseData })
  declare data: FindOneConversationResponseData;
}
