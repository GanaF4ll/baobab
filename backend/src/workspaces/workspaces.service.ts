import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, count, eq, ilike, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { CollectionResponseData } from 'src/shared/dto/output/api-collection-response.dto';
import { CreateWorkspaceDto } from './dto/input/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/input/update-workspace.dto';
import { WorkspaceFilterDto } from './dto/input/workspace-filter.dto';
import { WorkspaceEntity } from './entities/workspace.entity';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async create(createWorkspaceDto: CreateWorkspaceDto, ownerId: string): Promise<WorkspaceEntity> {
    const [newWorkspace] = await this.db
      .insert(schema.workspaces)
      .values({
        ownerId: ownerId,
        name: createWorkspaceDto.name,
        description: createWorkspaceDto.description ?? null,
      })
      .returning();

    this.logger.debug(`Workspace created, [${newWorkspace.id}]`);
    return newWorkspace;
  }

  async findAll(
    filter: WorkspaceFilterDto,
    ownerId: string,
  ): Promise<CollectionResponseData<WorkspaceEntity>> {
    const { limit, cursor, order, ...rest } = filter;
    const take = limit ?? 10;

    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorWorkspace = await this.db.query.workspaces.findFirst({
        where: (workspaces, { eq }) => eq(workspaces.id, cursor),
      });
      if (cursorWorkspace) {
        cursorDate = cursorWorkspace.createdAt;
      }
    }

    const [workspaces, [{ countValue }]] = await Promise.all([
      this.db.query.workspaces.findMany({
        where: (workspaces, { eq, and, ilike, gte, lte, ne }) =>
          and(
            eq(workspaces.ownerId, ownerId),
            ilike(workspaces.name, `%${rest.name ?? ''}%`),
            ...(cursorDate
              ? order === 'desc'
                ? [lte(workspaces.createdAt, cursorDate)]
                : [gte(workspaces.createdAt, cursorDate)]
              : []),
            ...(cursor ? [ne(workspaces.id, cursor)] : []),
          ),
        limit: take + 1,
        orderBy: (workspaces, { asc, desc }) =>
          order === 'desc' ? desc(workspaces.createdAt) : asc(workspaces.createdAt),
      }),
      this.db
        .select({ countValue: count() })
        .from(schema.workspaces)
        .where(
          and(
            eq(schema.workspaces.ownerId, ownerId),
            ilike(schema.workspaces.name, `%${rest.name ?? ''}%`),
          ),
        ),
    ]);

    const hasNextPage = workspaces.length > take;
    const items = hasNextPage ? workspaces.slice(0, take) : workspaces;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return {
      items,
      totalCount: Number(countValue),
      nextCursor,
    };
  }

  async findOne(id: string, ownerId: string): Promise<WorkspaceEntity> {
    const existingWs = await this.db.query.workspaces.findFirst({
      where: (workspaces, { eq, and }) =>
        and(eq(workspaces.id, id), eq(workspaces.ownerId, ownerId)),
    });

    if (!existingWs) {
      this.logger.error(`error finding workspace [${id}] for user [${ownerId}]`);
      throw new NotFoundException('Workspace not found');
    }

    return existingWs;
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
    ownerId: string,
  ): Promise<WorkspaceEntity> {
    const existingWs = await this.findOne(id, ownerId);
    const [updatedWs] = await this.db
      .update(schema.workspaces)
      .set({
        name: updateWorkspaceDto.name ?? existingWs.name,
        description: updateWorkspaceDto.description ?? existingWs.description,
        updatedAt: new Date(),
      })
      .where(eq(schema.workspaces.id, existingWs.id))
      .returning();

    this.logger.log(`Workspace updated with ID ${updatedWs.id}`);
    return updatedWs;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const existingWs = await this.findOne(id, ownerId);
    const [removedWs] = await this.db
      .update(schema.workspaces)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.workspaces.id, existingWs.id))
      .returning();

    if (existingWs.deletedAt) throw new BadRequestException('Workspace already deleted');

    this.logger.log(`Workspace soft deleted with ID ${removedWs.id}`);
  }

  async restore(id: string, ownerId: string): Promise<WorkspaceEntity> {
    const existingWs = await this.findOne(id, ownerId);

    if (!existingWs.deletedAt) throw new BadRequestException('Workspace is not deleted');

    const [restoredWs] = await this.db
      .update(schema.workspaces)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.workspaces.id, existingWs.id), isNotNull(schema.workspaces.deletedAt)))
      .returning();

    if (!restoredWs) throw new BadRequestException('Workspace is not deleted');

    this.logger.log(`Workspace restored with ID ${restoredWs.id}`);
    return restoredWs;
  }
}
