import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { IDocumentParser } from './document-parser.interface';

@Injectable()
export class PdfParser implements IDocumentParser {
  async parse(fileBuffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: fileBuffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
}
