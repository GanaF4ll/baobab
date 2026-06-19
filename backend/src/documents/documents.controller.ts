import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { UpdateDocumentTitleDto } from './dto/input/update-document-title.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { DocumentFilterDto } from './dto/input/document-filter.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Protected } from 'src/auth/decorators/protected.decorator';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { DocumentEntity } from './entities/document.entity';
import { DOCUMENTS_SWAGGER_TAG } from 'src/swagger.config';
import { FindOneWithVersionsResponseDto } from './dto/output/find-one-with-versions-response.dto';
import { FastifyFilesInterceptor } from 'src/shared/storage/interceptors/fastify-file.interceptor';
import { FastifyRequest } from 'fastify';
import { DocumentVersionResponseDto } from './dto/output/document-version-response.dto';
import { DeleteVersionDto } from './dto/input/delete-version.dto';
import { CreateDocumentDto } from './dto/input/create-document.dto';

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
    const documentVersion = await this.documentsService.create(userId, files[0], dto.workspaceId, dto.id);
    return { data: documentVersion };
  }

  @Get('collection')
  @Protected()
  @ApiOperation({ summary: "get all the user's documents" })
  @ApiBadRequestResponse({ description: 'invalid filters' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() filters: DocumentFilterDto,
  ): Promise<ApiCollectionResponseDto<DocumentEntity>> {
    const documentList = await this.documentsService.findAll(userId, filters);
    return {
      data: documentList,
    };
  }

  @Get(':id')
  @Protected()
  @ApiOperation({ summary: 'get a single document by id, with its versions' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<FindOneWithVersionsResponseDto> {
    const data = await this.documentsService.findOneWithVersions(id, userId);
    return { data };
  }

  @Patch(':id')
  @Protected()
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDocumentTitleDto,
  ) {
    return this.documentsService.updateTitle(id, userId, dto);
  }

  @Delete('version')
  @Protected()
  @ApiOperation({ summary: 'remove a document version' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiNotFoundResponse({ description: 'Version not found' })
  @ApiNoContentResponse({ description: 'Document version deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVersion(
    @Body() dto: DeleteVersionDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.documentsService.removeVersion(dto.documentId, userId, dto.id);
  }
}
