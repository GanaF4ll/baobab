export interface IDocumentParser {
  parse(fileBuffer: Buffer): Promise<string>;
}
