import { PickType } from '@nestjs/swagger';
import { DocumentVersionEntity } from 'src/documents/entities/document-version.entity';

export class DeleteVersionDto extends PickType(DocumentVersionEntity, ['id', 'documentId']) {}
