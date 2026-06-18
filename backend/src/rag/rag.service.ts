import { Inject, Injectable, Logger } from '@nestjs/common';
import { OllamaService } from '../ollama/ollama.service';
import * as schema from 'src/drizzle/schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { cosineDistance, inArray } from 'drizzle-orm';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly ollamaService: OllamaService,
  ) {}

  /**
   * @description Vectorise la question de l'utilisateur via nomic-embed-text
   * @param question La question brute envoyée par l'utilisateur
   * @returns Le vecteur de 768 dimensions
   */
  private async vectorizeQuestion(question: string): Promise<number[]> {
    this.logger.debug(`Generating embedding for question: "${question}"`);

    const questionEmbedding = await this.ollamaService.generateSingleEmbedding(question);

    this.logger.debug(
      `Question embedding generated successfully (Dimensions: ${questionEmbedding.length})`,
    );
    return questionEmbedding;
  }

  /**
   * @description Perform a vector similarity search across multiple documents in PostgreSQL using pgvector
   * @param {string} question - The user's question
   * @param {string[]} documentIds - Array of document IDs to search within
   * @param {number} [topK=4] - The number of most relevant chunks to retrieve
   * @returns {Promise<any[]>} Array of the most similar text chunks
   */
  async searchSimilarChunks(question: string, documentIds: string[], topK = 4) {
    //* Edge case: Handle empty array to prevent SQL syntax errors or unexpected database scans
    if (!documentIds || documentIds.length === 0) {
      this.logger.warn('No document IDs provided for multi-document vector search.');
      return [];
    }

    const questionVector = await this.vectorizeQuestion(question);

    this.logger.debug(
      `Searching for top ${topK} similar chunks across ${documentIds.length} documents...`,
    );

    const similarChunks = await this.db
      .select({
        id: schema.chunks.id,
        documentId: schema.chunks.documentId,
        content: schema.chunks.content,
        chunkIndex: schema.chunks.chunkIndex,
        //? Calculate the similarity distance score (0 = identical, 2 = completely opposite)
        distance: cosineDistance(schema.chunks.embedding, questionVector),
      })
      .from(schema.chunks)
      .where(inArray(schema.chunks.documentId, documentIds))
      .orderBy(cosineDistance(schema.chunks.embedding, questionVector))
      .limit(topK);

    return similarChunks;
  }
}
