import { PartialType, PickType } from '@nestjs/swagger';
import { CreateConversationDto } from './create-conversation.dto';

export class UpdateConversationDto extends PartialType(
  PickType(CreateConversationDto, ['title']),
) {}
