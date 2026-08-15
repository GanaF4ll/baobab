import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { mimeTypeEnum } from 'src/drizzle/schema';

export class TrashItemMetadataDto {
  @ApiProperty({
    description: 'The mime type of the document',
    example: 'application/pdf',
    enum: mimeTypeEnum.enumValues,
  })
  @IsEnum(mimeTypeEnum.enumValues)
  @IsOptional()
  @ValidateIf((o) => o.type === 'document')
  mimeType?: (typeof mimeTypeEnum.enumValues)[number];

  @ApiProperty({
    description: 'The number of messages in the conversation',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @ValidateIf((o) => o.type === 'conversation')
  messageCount?: number;
}

export class TrashItemDto {
  @ApiProperty({
    description: 'The id of the trash item',
    example: '3b1108a0-d451-4d4b-be6e-32d546b6145f',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'The type of the trash item',
    example: 'workspace',
    enum: ['workspace', 'document', 'conversation'],
  })
  @IsEnum(['workspace', 'document', 'conversation'])
  type: 'workspace' | 'document' | 'conversation';

  @ApiProperty({
    description: 'The title of the trash item',
    example: 'My Document',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The deletion date of the trash item',
  })
  @IsDateString()
  deletedAt: string;

  @ApiProperty({
    description: 'The expiration date of the trash item',
  })
  @IsDateString()
  expiresAt: string;

  @ApiProperty({
    description: 'The id of the workspace',
    example: '3b1108a0-d451-4d4b-be6e-32d546b6145f',
  })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.type === 'document' || o.type === 'conversation')
  workspaceId?: string;

  @ApiProperty({
    description: 'The name of the workspace',
    example: 'My Workspace',
  })
  @IsString()
  @IsOptional()
  workspaceName?: string;

  @ApiProperty({
    description: 'The metadata of the trash item',
    example: {
      mimeType: 'application/pdf',
      messageCount: 10,
    },
    type: () => TrashItemMetadataDto,
  })
  @IsObject()
  @IsOptional()
  metadata?: TrashItemMetadataDto;
}
