import { ApiProperty } from '@nestjs/swagger';
import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';
import { WorkspaceEntity } from 'src/workspaces/entities/workspace.entity';

export class FindOneWorkspaceResponseDto extends ApiResponseDto<WorkspaceEntity> {
  @ApiProperty({
    description: 'workspace data',
    type: WorkspaceEntity,
  })
  declare data: WorkspaceEntity;
}
