import { toApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { WorkspaceEntity } from 'src/workspaces/entities/workspace.entity';

export const WorkspaceCollectionResponseDto = toApiCollectionResponseDto(WorkspaceEntity);
