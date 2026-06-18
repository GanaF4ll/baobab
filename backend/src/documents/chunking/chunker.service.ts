// backend/src/documents/chunking/chunker.service.ts
import { Injectable } from '@nestjs/common';
import { encode, decode } from 'gpt-tokenizer';

export interface IChunkResult {
  content: string;
  chunkIndex: number;
}

@Injectable()
export class ChunkerService {
  private readonly chunkSize = 512; // tokens par chunk
  private readonly overlap = 50; // tokens partagés entre chunks

  /**
   * Splits a text into fixed-size chunks with overlap between consecutive
   * chunks.
   *
   * Splitting is done at the token level (rather than characters) to ensure
   * a chunk size consistent with the constraints of the downstream embedding
   * model (`nomic-embed-text`).
   *
   * The overlap prevents an idea spanning two chunks from being cut
   * incompletely in either of them — each chunk shares its last `overlap`
   * tokens with the next chunk.
   *
   * @example
   *  With chunkSize = 512 and overlap = 50:
   *  Chunk 0: tokens [0..512]
   *  Chunk 1: tokens [462..974]   ← 50 tokens shared with chunk 0
   *  Chunk 2: tokens [924..1436]  ← 50 tokens shared with chunk 1
   *
   * @param text - The raw text to split (already extracted by a `DocumentParser`).
   * @returns An array of chunks, each with its text content and its position
   *          (`chunkIndex`) in the original document order.
   */
  chunkText(text: string): IChunkResult[] {
    const tokens = encode(text);
    const chunks: IChunkResult[] = [];

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < tokens.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, tokens.length);
      const chunkTokens = tokens.slice(startIndex, endIndex);

      chunks.push({
        content: decode(chunkTokens),
        chunkIndex,
      });

      chunkIndex++;
      startIndex += this.chunkSize - this.overlap;
    }

    return chunks;
  }
}
