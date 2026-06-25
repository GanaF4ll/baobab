import { DocumentEntity } from 'src/documents/entities/document.entity';
import { toApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';

export const DocumentCollectionResponseDto = toApiCollectionResponseDto(DocumentEntity);
