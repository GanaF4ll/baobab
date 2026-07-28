import { ApiProperty, OmitType } from '@nestjs/swagger';
import { DocumentEntity } from 'src/documents/entities/document.entity';
import { DocumentVersionEntity } from 'src/documents/entities/document-version.entity';
import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';

export class VersionDto extends OmitType(DocumentVersionEntity, ['documentId']) {}

export class FindOneWithVersionsResponseData extends DocumentEntity {
  @ApiProperty({
    type: [VersionDto],
    description: 'the different versions of the document',
  })
  declare versions: VersionDto[];
}

export class FindOneWithVersionsResponseDto extends ApiResponseDto<FindOneWithVersionsResponseData> {
  @ApiProperty({ type: FindOneWithVersionsResponseData })
  declare data: FindOneWithVersionsResponseData;
}
