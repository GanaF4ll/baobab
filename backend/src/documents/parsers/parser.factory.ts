import { Injectable } from '@nestjs/common';
import { IDocumentParser } from './document-parser.interface';
import { MarkdownParser } from './markdown.parser';
import { PdfParser } from './pdf.parser';

@Injectable()
export class ParserFactory {
  constructor(
    private readonly pdfParser: PdfParser,
    private readonly markdownParser: MarkdownParser,
  ) {}

  getParser(mimeType: string): IDocumentParser {
    switch (mimeType) {
      case 'application/pdf':
        return this.pdfParser;
      case 'text/markdown':
        return this.markdownParser;
      default:
        throw new Error(`Type de fichier non supporté : ${mimeType}`);
    }
  }
}
