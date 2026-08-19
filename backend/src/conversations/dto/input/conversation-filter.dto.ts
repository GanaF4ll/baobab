import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/shared/dto/input/filter.dto';

export class ConversationFilterDto extends FilterDto {
  @ApiProperty({ description: 'Search query', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
