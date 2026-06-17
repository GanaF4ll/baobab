import { ApiProperty } from '@nestjs/swagger';
import { IsMimeType, IsNotEmpty, IsString } from 'class-validator';

export class CreateFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File buffer to upload',
  })
  @IsNotEmpty()
  buffer: Buffer;

  @ApiProperty()
  @IsMimeType()
  @IsNotEmpty()
  mimetype: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  originalname: string;
}
