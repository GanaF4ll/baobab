import { PickType } from '@nestjs/swagger';
import { MessageEntity } from 'src/conversations/entities/message.entity';

export class CreateMessageDto extends PickType(MessageEntity, ['content', 'role', 'sources']) {}
