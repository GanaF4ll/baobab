import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Protected } from 'src/auth/decorators/protected.decorator';
import { ApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';
import { WORKSPACES_SWAGGER_TAG } from '../swagger.config';
import { CreateWorkspaceDto } from './dto/input/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/input/update-workspace.dto';
import { WorkspaceFilterDto } from './dto/input/workspace-filter.dto';
import { FindOneWorkspaceResponseDto } from './dto/output/find-one-workspace-response.dto';
import { WorkspaceCollectionResponseDto } from './dto/output/workspace-collection-response.dto';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspacesService } from './workspaces.service';

@ApiTags(WORKSPACES_SWAGGER_TAG)
@Controller('workspaces')
@ApiBearerAuth('JWT-auth')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @Protected()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiBadRequestResponse({ description: 'Bad Request - invalid payload' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiCreatedResponse({ description: 'The created workspace', type: FindOneWorkspaceResponseDto })
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @CurrentUser('id') ownerId: string,
  ): Promise<ApiResponseDto<WorkspaceEntity>> {
    const data = await this.workspacesService.create(createWorkspaceDto, ownerId);
    return {
      data,
    };
  }

  @Get('collection')
  @Protected()
  @ApiOperation({ summary: "Get all user's workspaces" })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOkResponse({ type: WorkspaceCollectionResponseDto })
  async findAll(
    @Query() filter: WorkspaceFilterDto,
    @CurrentUser('id') ownerId: string,
  ): Promise<ApiCollectionResponseDto<WorkspaceEntity>> {
    const data = await this.workspacesService.findAll(filter, ownerId);
    return {
      data,
    };
  }

  @Get(':id')
  @Protected()
  @ApiOperation({ summary: 'get a workspace by its id' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOkResponse({ description: 'The workspace', type: FindOneWorkspaceResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string,
  ): Promise<ApiResponseDto<WorkspaceEntity>> {
    const data = await this.workspacesService.findOne(id, ownerId);

    if (data.deletedAt) throw new NotFoundException('Workspace not found');

    return {
      data,
    };
  }

  @Patch(':id')
  @Protected()
  @ApiOperation({ summary: 'update a workspace' })
  @ApiBadRequestResponse({ description: 'Bad Request - invalid payload' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  @ApiOkResponse({ description: 'The updated workspace', type: FindOneWorkspaceResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @CurrentUser('id') ownerId: string,
  ): Promise<ApiResponseDto<WorkspaceEntity>> {
    const data = await this.workspacesService.update(id, updateWorkspaceDto, ownerId);
    return {
      data,
    };
  }

  @Patch('restore/:id')
  @Protected()
  @ApiOperation({ summary: 'restores a soft deleted workspace, sets the deletedAt back to null' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  @ApiOkResponse({ description: 'The updated workspace', type: FindOneWorkspaceResponseDto })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string,
  ): Promise<ApiResponseDto<WorkspaceEntity>> {
    const data = await this.workspacesService.restore(id, ownerId);
    return {
      data,
    };
  }

  @Delete(':id')
  @Protected()
  @ApiOperation({ summary: 'deletes a workspace, set a deleted at timestamp' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  @ApiBadRequestResponse({ description: 'Workspace already deleted' })
  @ApiNoContentResponse({ description: 'The deleted workspace' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string,
  ): Promise<void> {
    await this.workspacesService.softDelete(id, ownerId);
  }
}
