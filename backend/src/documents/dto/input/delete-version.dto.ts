import { ApiProperty, PickType } from '@nestjs/swagger';
import { DocumentVersionEntity } from 'src/documents/entities/document-version.entity';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteVersionDto extends PickType(DocumentVersionEntity, ['id', 'documentId']) {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ description: 'The ID of the workspace which the document belongs to' })
  workspaceId: string;
}
