import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { DrizzleDb } from 'src/drizzle/types/drizzle';

export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE)
    private readonly drizzle: DrizzleDb,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { id: userId } = req.user;
    const workspaceId = req.params.workspaceId || req.body?.workspaceId;

    const workspace = await this.drizzle.query.workspaces.findFirst({
      where: (workspaces, { eq }) => eq(workspaces.id, workspaceId),
      columns: {
        id: true,
        ownerId: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerId !== userId)
      throw new ForbiddenException('You are not a member of this workspace');
    //todo: when implemented check the workspace_members tables too
    return true;
  }
}
