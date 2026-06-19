import { Inject, Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { WorkspaceEntity } from '../entities/workspace.entity';

@Injectable()
export class WorkspaceValidationPipe implements PipeTransform {
  constructor(@Inject(DRIZZLE) private readonly drizzle: DrizzleDb) {}
  async transform(id: string): Promise<Pick<WorkspaceEntity, 'id' | 'ownerId' | 'deletedAt'>> {
    const existingWs = await this.drizzle.query.workspaces.findFirst({
      where: (workspaces, { eq }) => eq(workspaces.id, id),
      columns: {
        id: true,
        ownerId: true,
        deletedAt: true,
      },
    });
    if (!existingWs) throw new NotFoundException('Workspace not found');

    return existingWs;
  }
}
