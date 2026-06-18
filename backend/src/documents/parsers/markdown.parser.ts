import { Injectable } from '@nestjs/common';
import { IDocumentParser } from './document-parser.interface';

@Injectable()
export class MarkdownParser implements IDocumentParser {
  async parse(fileBuffer: Buffer): Promise<string> {
    return fileBuffer.toString('utf-8');
  }
}
