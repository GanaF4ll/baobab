import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { StorageModule } from 'src/shared/storage/storage.module';
import { ParserFactory } from './parsers/parser.factory';
import { PdfParser } from './parsers/pdf.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { ChunkerService } from './chunking/chunker.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, ParserFactory, PdfParser, MarkdownParser, ChunkerService],
  imports: [StorageModule],
})
export class DocumentsModule {}
