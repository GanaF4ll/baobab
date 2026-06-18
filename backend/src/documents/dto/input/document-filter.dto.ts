import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { mimeTypeEnum } from 'src/drizzle/schema';
import { FilterDto } from 'src/shared/dto/input/filter.dto';

export class DocumentFilterDto extends FilterDto {
  @ApiProperty({
    description: 'The mime type of the document',
    example: 'application/pdf',
    enum: mimeTypeEnum.enumValues,
    required: false,
    default: null,
  })
  @IsOptional()
  @IsIn(mimeTypeEnum.enumValues)
  mimeType: (typeof mimeTypeEnum.enumValues)[number];
}
