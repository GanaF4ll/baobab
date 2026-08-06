import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsOptional, Length } from 'class-validator';
import { IsUnicodeEmoji } from 'src/workspaces/validators/emoji.validator';
import { WorkspaceEntity } from '../../entities/workspace.entity';

export class CreateWorkspaceDto extends PickType(WorkspaceEntity, ['name', 'description']) {
  @ApiProperty({
    description: 'Icon of the workspace',
    required: false,
    nullable: true,
    type: String,
    example: '🐲',
  })
  @IsOptional()
  @Length(1, 1)
  @IsUnicodeEmoji()
  icon?: string | null;
}
