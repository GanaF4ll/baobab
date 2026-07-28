import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { DocumentVersionEntity } from 'src/documents/entities/document-version.entity';

export class DeleteVersionDto extends PickType(DocumentVersionEntity, ['id']) {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ description: 'The ID of the document' })
  documentId: string;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ description: 'The ID of the workspace which the document belongs to' })
  workspaceId: string;
}
