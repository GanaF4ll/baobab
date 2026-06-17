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
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/input/create-document.dto';
import { UpdateDocumentTitleDto } from './dto/input/update-document-title.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { DocumentFilterDto } from './dto/input/document-filter.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Protected } from 'src/auth/decorators/protected.decorator';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { DocumentEntity } from './entities/document.entity';
import { DOCUMENTS_SWAGGER_TAG } from 'src/swagger.config';
import { FindOneWithVersionsResponseDto } from './dto/output/find-one-with-versions-response.dto';

@Controller('documents')
@ApiTags(DOCUMENTS_SWAGGER_TAG)
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(createDocumentDto);
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

  @Delete(':id/:versionNumber')
  @Protected()
  @ApiOperation({ summary: 'remove a document version' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  @ApiNotFoundResponse({ description: 'Version not found' })
  async removeVersion(
    @Param('id') id: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.documentsService.removeVersion(id, userId, +versionNumber);
  }
}
