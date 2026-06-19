import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { MessageEntity } from 'src/conversations/entities/message.entity';

export class MessageContent extends PickType(MessageEntity, ['content', 'role']) {}

export class AskLlmDto {
  @ApiProperty({ description: 'The question to ask the LLM' })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({
    description: 'The IDs of the document versions to use',
    isArray: true,
    type: 'string',
  })
  @IsNotEmpty()
  @IsUUID('all', { each: true })
  versionIds: string[];
}
