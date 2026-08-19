import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/shared/dto/input/filter.dto';

export class WorkspaceFilterDto extends FilterDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'name of the workspace to search', required: false })
  name?: string;
}
