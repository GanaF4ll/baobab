import { ApiProperty, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';
import { MessageEntity } from 'src/conversations/entities/message.entity';

export class MessageContent extends PickType(MessageEntity, ['content', 'role']) {}

export class AskLlmDto {
  @ApiProperty({ description: 'The question to ask the LLM' })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({
    description: 'The IDs of the documents to use',
    isArray: true,
    type: 'string',
  })
  @IsNotEmpty()
  @IsUUID('all', { each: true })
  documentIds: string[];

  @ApiProperty({ description: 'The history of the conversation' })
  @Type(() => MessageContent)
  @ValidateNested({ each: true })
  history: MessageContent[];
}
