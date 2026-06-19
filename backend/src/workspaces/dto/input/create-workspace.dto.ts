import { PickType } from '@nestjs/swagger';
import { WorkspaceEntity } from '../../entities/workspace.entity';

export class CreateWorkspaceDto extends PickType(WorkspaceEntity, ['name', 'description']) {}
