import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Protected } from 'src/auth/decorators/protected.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { FastifyFilesInterceptor } from 'src/shared/storage/interceptors/fastify-file.interceptor';
import { DOCUMENTS_SWAGGER_TAG } from 'src/swagger.config';
import { WorkspaceMemberGuard } from 'src/workspaces/guards/workspace-member.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/input/create-document.dto';
import { DeleteDocumentDto } from './dto/input/delete-document.dto';
import { DeleteVersionDto } from './dto/input/delete-version.dto';
import { DocumentFilterDto } from './dto/input/document-filter.dto';
import { UpdateDocumentTitleDto } from './dto/input/update-document-title.dto';
import { DocumentCollectionResponseDto } from './dto/output/document-collection-response.dto';
import { DocumentVersionResponseDto } from './dto/output/document-version-response.dto';
import { FindOneWithVersionsResponseDto } from './dto/output/find-one-with-versions-response.dto';
import { DocumentEntity } from './entities/document.entity';

@Controller('documents')
@ApiTags(DOCUMENTS_SWAGGER_TAG)
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('')
  @Protected()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(new FastifyFilesInterceptor('file'))
  @ApiOperation({ summary: 'Create a new document or add a new version to an existing document' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiCreatedResponse({
    description: 'Document created or new version created',
    type: DocumentVersionResponseDto,
  })
  async create(
    @Req() request: FastifyRequest,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentVersionResponseDto> {
    const files = (request as any).incomingFiles;
    const documentVersion = await this.documentsService.create(
      userId,
      files[0],
      dto.workspaceId,
      dto.id,
    );
    return { data: documentVersion };
  }

  @Get('collection/:workspaceId')
  @Protected()
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: "get all the user's documents" })
  @ApiOkResponse({ type: DocumentCollectionResponseDto })
  @ApiBadRequestResponse({ description: 'invalid filters' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  async findAllByWorkspace(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query() filters: DocumentFilterDto,
  ): Promise<ApiCollectionResponseDto<DocumentEntity>> {
    const documentList = await this.documentsService.findAllByWorkspace(
      userId,
      workspaceId,
      filters,
    );
    return {
      data: documentList,
    };
  }

  @Get(':id')
  @Protected()
  @ApiOperation({ summary: 'get a single document by id, with its versions' })
  @ApiOkResponse({ type: FindOneWithVersionsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<FindOneWithVersionsResponseDto> {
    const data = await this.documentsService.findOneWithVersions(id, userId);
    return { data };
  }

  @Get(':id/versions/:versionId/content')
  @Protected()
  @ApiOperation({ summary: 'Get the content of a document version' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document or Version not found' })
  @ApiProduces('application/text', 'application/octet-stream', 'text/markdown')
  async getVersionContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ content: string; mimeType: string }> {
    return this.documentsService.getVersionContent(id, versionId, userId);
  }

  @Get(':id/versions/:versionId/file')
  @Protected()
  @ApiOperation({ summary: 'Get the file binary of a document version' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document or Version not found' })
  async getVersionFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser('id') userId: string,
  ): Promise<StreamableFile> {
    const fileData = await this.documentsService.getVersionFile(id, versionId, userId);
    return new StreamableFile(fileData.buffer, {
      type: fileData.mimeType,
      disposition: 'inline',
    });
  }

  @Patch(':id')
  @Protected()
  @ApiOperation({ summary: 'Update a document title' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDocumentTitleDto,
  ) {
    return this.documentsService.updateTitle(id, userId, dto);
  }

  @Patch('/restore')
  @Protected()
  @ApiOperation({ summary: 'restores a document from trash' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  restoreDocument(@CurrentUser('id') userId: string, @Body() dto: DeleteDocumentDto) {
    return this.documentsService.restoreDocument(dto.id, dto.workspaceId, userId);
  }

  @Patch('version/restore')
  @Protected()
  @ApiOperation({ summary: 'restore a document version' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiNotFoundResponse({ description: 'Version not found' })
  @ApiNoContentResponse({ description: 'Document version restored' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreVersion(
    @Body() dto: DeleteVersionDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.documentsService.restoreVersion(dto.documentId, userId, dto.id, dto.workspaceId);
  }

  @Delete('trash')
  @Protected()
  @ApiOperation({ summary: 'soft delete a document and its versions (move to trash)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiNoContentResponse({ description: 'Document version deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteDocument(
    @Body() dto: DeleteDocumentDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.documentsService.softDeleteDocument(dto.id, dto.workspaceId, userId);
  }

  @Delete('')
  @Protected()
  @ApiOperation({ summary: 'remove a document and its versions permanently' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiNoContentResponse({ description: 'Document deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDocument(
    @Body() dto: DeleteDocumentDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.documentsService.removeDocument(dto.id, dto.workspaceId, userId);
  }

  @Delete('version/trash')
  @Protected()
  @ApiOperation({ summary: 'soft delete a document version (move to trash)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiNotFoundResponse({ description: 'Version not found' })
  @ApiNoContentResponse({ description: 'Document version soft deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteVersion(
    @Body() dto: DeleteVersionDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.documentsService.softDeleteVersion(dto.documentId, userId, dto.id, dto.workspaceId);
  }

  @Delete('version')
  @Protected()
  @ApiOperation({ summary: 'remove a document version and its content from the bucket' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiNotFoundResponse({ description: 'Version not found' })
  @ApiNoContentResponse({ description: 'Document version deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVersion(
    @Body() dto: DeleteVersionDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.documentsService.removeVersion(dto.documentId, userId, dto.id, dto.workspaceId);
  }
}
