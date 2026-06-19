import { IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/shared/dto/input/filter.dto';

export class WorkspaceFilterDto extends FilterDto {
  @IsString()
  @IsOptional()
  name?: string;
}
