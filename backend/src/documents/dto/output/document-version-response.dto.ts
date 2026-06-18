import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';
import { DocumentVersionEntity } from 'src/documents/entities/document-version.entity';

export class DocumentVersionResponseDto extends ApiResponseDto<DocumentVersionEntity> {}
