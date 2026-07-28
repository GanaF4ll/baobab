import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class DocumentVersionEntity {
  @ApiProperty({ description: 'id of the document version' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'id of the document' })
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @ApiProperty({ description: 'version number of the document' })
  @IsInt()
  versionNumber: number;

  @ApiProperty({ description: 'storage key of the document' })
  @IsString()
  storageKey: string;

  @ApiProperty({ description: 'change summary of the document' })
  @IsString()
  @IsOptional()
  changeSummary?: string | null;

  @ApiProperty({ description: 'creation date of the document' })
  @IsDateString()
  createdAt: Date;
}
