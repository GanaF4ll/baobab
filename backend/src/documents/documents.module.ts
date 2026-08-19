import { Module } from '@nestjs/common';
import { OllamaModule } from 'src/ollama/ollama.module';
import { StorageModule } from 'src/shared/storage/storage.module';
import { ChunkerService } from './chunking/chunker.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MarkdownParser } from './parsers/markdown.parser';
import { ParserFactory } from './parsers/parser.factory';
import { PdfParser } from './parsers/pdf.parser';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, ParserFactory, PdfParser, MarkdownParser, ChunkerService],
  imports: [StorageModule, OllamaModule],
  exports: [DocumentsService],
})
export class DocumentsModule {}
