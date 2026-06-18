import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDocumentTitleDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'New title of the document', example: 'new title' })
  readonly title: string;
}
