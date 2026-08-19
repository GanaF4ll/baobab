import { PickType } from '@nestjs/swagger';
import { DocumentEntity } from 'src/documents/entities/document.entity';

export class DeleteDocumentDto extends PickType(DocumentEntity, ['id', 'workspaceId']) {}
