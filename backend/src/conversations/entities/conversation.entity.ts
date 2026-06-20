import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ConversationEntity {
  @ApiProperty({
    description: 'id of the conversation',
    example: '0199e49a-85d7-77a0-917a-258c748b177e',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'workspace id of the conversation',
    example: '0199e49a-85d7-77a0-917a-258c748b177f',
  })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({
    description: 'title of the conversation',
    example: 'My conversation',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'user id of the conversation',
    example: '0199e49a-85d7-77a0-917a-258c748b177g',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Date of creation of the conversation',
    example: '2027-01-01T00:00:00.000Z',
  })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({
    description: 'Date of deletion of the conversation',
    nullable: true,
    example: '2030-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  deletedAt?: Date | null;
}
