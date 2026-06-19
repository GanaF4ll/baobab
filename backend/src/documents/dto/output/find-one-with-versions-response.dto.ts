import { ApiProperty, OmitType } from '@nestjs/swagger';
import { DocumentVersionEntity } from 'src/documents/entities/document-version.entity';
import { DocumentEntity } from 'src/documents/entities/document.entity';
import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';

export class VersionDto extends OmitType(DocumentVersionEntity, ['documentId']) {}

export class FindOneWithVersionsResponseData extends DocumentEntity {
  @ApiProperty({
    type: [VersionDto],
    isArray: true,
    description: 'the different versions of the document',
  })
  versions: VersionDto[];
}

export class FindOneWithVersionsResponseDto extends ApiResponseDto<FindOneWithVersionsResponseData> {
  @ApiProperty({ type: FindOneWithVersionsResponseData })
  declare data: FindOneWithVersionsResponseData;
}
