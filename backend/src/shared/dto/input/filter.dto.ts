import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { OrderFilter } from 'src/shared/constants';

export class FilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @ApiProperty({
    description: 'Limit of items<T> to return',
    example: 10,
    required: false,
    type: Number,
    default: 10,
  })
  limit?: number;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    description: 'ID based cursor for pagination',
    example: 'b33b7fe1-1f99-41ed-b52b-17d1a7d0f074',
    required: false,
    type: String,
    default: null,
  })
  cursor?: string;

  @ApiProperty({
    description: 'Order filter for SQL Queries',
    enum: OrderFilter,
    required: false,
    default: OrderFilter.DESC,
  })
  @IsOptional()
  @IsEnum(OrderFilter)
  order?: OrderFilter;
}
