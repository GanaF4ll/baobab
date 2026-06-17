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
import { UpdateDocumentDto } from './dto/input/update-document.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { DocumentFilterDto } from './dto/input/document-filter.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Protected } from 'src/auth/decorators/protected.decorator';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { DocumentEntity } from './entities/document.entity';

@Controller('documents')
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
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.documentsService.findOneWithVersions(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
