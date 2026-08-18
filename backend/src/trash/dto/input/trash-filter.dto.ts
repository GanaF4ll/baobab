import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { FilterDto } from 'src/shared/dto/input/filter.dto';

export enum RessouceType {
  Document = 'Document',
  Version = 'Version',
  Workspace = 'Workspace',
  Conversation = 'Conversation',
}

export class TrashFilterDto extends FilterDto {
  @ApiProperty({
    description: 'Ressource types to filter (can be repeated)',
    example: [RessouceType.Document, RessouceType.Workspace],
    required: false,
    isArray: true,
    enum: RessouceType,
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsEnum(RessouceType, { each: true })
  ressourceType?: RessouceType[];

  @ApiProperty({
    description: 'Search query for the ressource name',
    example: 'My Document',
    required: false,
  })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Offset for pagination',
    example: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
