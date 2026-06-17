import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { DocumentEntity } from 'src/documents/entities/document.entity';

export class CreateDocumentDto extends PickType(DocumentEntity, ['mimeType', 'title']) {
  @ApiProperty({
    description: 'The id of the document',
    example: '3b1108a0-d451-4d4b-be6e-32d546b6145f',
  })
  @IsOptional()
  @IsUUID()
  id?: string;
}
