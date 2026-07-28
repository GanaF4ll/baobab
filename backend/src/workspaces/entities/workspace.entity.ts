import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class WorkspaceEntity {
  @ApiProperty({ description: 'id of the workspace' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'name of the workspace' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'description of the workspace', nullable: true, type: String })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ description: 'owner id of the workspace' })
  @IsUUID()
  ownerId: string;

  @ApiProperty({ description: 'Date of creation of the workspace' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Date of last update of the workspace' })
  @IsDateString()
  updatedAt: Date;

  @ApiProperty({ description: 'Date of deletion of the workspace', nullable: true })
  @IsOptional()
  @IsDateString()
  deletedAt?: Date | null;

  @ApiProperty({ description: 'Number of documents in the workspace', required: false })
  @IsOptional()
  @IsNumber()
  documentCount?: number;
}
