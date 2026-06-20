import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ConversationEntity {
  @ApiProperty({ description: 'id of the conversation' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'workspace id of the conversation' })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ description: 'title of the conversation' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'user id of the conversation' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Date of creation of the conversation' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Date of deletion of the conversation', nullable: true })
  @IsOptional()
  @IsDateString()
  deletedAt?: Date | null;
}

