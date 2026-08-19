import { ApiProperty } from '@nestjs/swagger';
import { DocumentVersionEntity } from 'src/documents/entities/document-version.entity';
import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';

export class DocumentVersionResponseDto extends ApiResponseDto<DocumentVersionEntity> {
  @ApiProperty({ description: 'the document version response', type: DocumentVersionEntity })
  declare data: DocumentVersionEntity;
}
