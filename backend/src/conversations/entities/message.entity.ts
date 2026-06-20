import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsIn, IsString, IsUUID, ValidateIf } from 'class-validator';
import { messageRoleEnum } from 'src/drizzle/schema';

export class MessageEntity {
  @ApiProperty({
    description: 'The id of the message',
    example: '3b1108a0-d451-4d4b-be6e-32d546b6145f',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'The id of the conversation',
    example: '3b1108a0-d451-4d4b-be6e-32d546b6145f',
  })
  @IsUUID()
  conversationId: string;

  @ApiProperty({
    description: 'The role of the message',
    example: 'user',
    enum: messageRoleEnum.enumValues,
  })
  @IsIn(messageRoleEnum.enumValues)
  role: (typeof messageRoleEnum.enumValues)[number];

  @ApiProperty({
    description: 'The content of the message',
    example: 'Hello, how are you?',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'The creation date of the message',
    example: '2022-01-01T00:00:00.000Z',
  })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({
    description: 'The sources of the message',
    example: ['3b1108a0-d451-4d4b-be6e-32d546b6145f'],
    isArray: true,
    type: 'string',
  })
  @ValidateIf((dto) => dto.role === 'assistant')
  @IsArray()
  @IsUUID('all', { each: true })
  sources?: string[] | null;
}
