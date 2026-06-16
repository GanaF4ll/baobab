import { mimeTypeEnum } from './../../drizzle/schema';
import { ApiProperty } from '@nestjs/swagger';

export class DocumentEntity {
  @ApiProperty({
    description: 'The id of the document',
    example: '3b1108a0-d451-4d4b-be6e-32d546b6145f',
  })
  id: string;

  @ApiProperty({
    description: 'The id of the user',
    example: 'b33b7fe1-1f99-41ed-b52b-17d1a7d0f074',
  })
  userId: string;

  @ApiProperty({
    description: 'The title of the document',
    example: 'My Document',
  })
  title: string;

  @ApiProperty({
    description: 'The creation date of the document',
    example: '2022-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The update date of the document',
    example: '2022-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'The current version of the document',
    example: 1,
  })
  currentVersion: number;

  @ApiProperty({
    description: 'The mime type of the document',
    example: 'application/pdf',
    enum: Object.values(mimeTypeEnum),
  })
  mimeType: (typeof mimeTypeEnum)[keyof typeof mimeTypeEnum];
}
