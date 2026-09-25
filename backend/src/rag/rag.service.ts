import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, cosineDistance, eq, inArray, isNull } from 'drizzle-orm';
import { map } from 'rxjs';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { DocumentsService } from '../documents/documents.service';
import { OllamaService } from '../ollama/ollama.service';
import { SimilarChunkResponseDto } from './dto/output/similar-chunk-response.dto';

import { getRewriteInstructions, getSystemInstructions } from './system-instructions';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly ollamaService: OllamaService,
    private readonly documentsService: DocumentsService,
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
  async searchSimilarChunks(
    question: string,
    versionIds: string[],
    topK = 4,
  ): Promise<SimilarChunkResponseDto[]> {
    //* Edge case: Handle empty array to prevent SQL syntax errors or unexpected database scans
    if (!versionIds || versionIds.length === 0) {
      this.logger.warn('No document IDs provided for multi-document vector search.');
      return [];
    }

    await this.documentsService.ensureChunksExist(versionIds);

    const questionVector = await this.vectorizeQuestion(question);

    this.logger.debug(
      `Searching for top ${topK} similar chunks across ${versionIds.length} documents...`,
    );

    const similarChunks = await this.db
      .select({
        id: schema.chunks.id,
        workspaceId: schema.chunks.workspaceId,
        content: schema.chunks.content,
        chunkIndex: schema.chunks.chunkIndex,
        versionId: schema.chunks.versionId,
        //? Calculate the similarity distance score (0 = identical, 2 = completely opposite)
        distance: cosineDistance(schema.chunks.embedding, questionVector),
      })
      .from(schema.chunks)
      .innerJoin(schema.documentVersions, eq(schema.chunks.versionId, schema.documentVersions.id))
      .where(
        and(
          inArray(schema.chunks.versionId, versionIds),
          isNull(schema.documentVersions.deletedAt),
        ),
      )
      .orderBy(cosineDistance(schema.chunks.embedding, questionVector))
      .limit(topK);

    return similarChunks;
  }

  /**
   * @description Reformulate a user follow-up question into a standalone query taking history into account
   * @param {string} question - The user's current question
   * @param {Array<{ role: 'user' | 'assistant'; content: string }>} history - Recent chat history
   * @returns {Promise<string>} Standalone search query
   */
  async contextualizeQuery(
    question: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    if (!history || history.length === 0) {
      return question;
    }

    try {
      this.logger.debug(
        `Contextualizing query for RAG: "${question}" with ${history.length} history messages`,
      );

      const rewritePrompt = [
        getRewriteInstructions(),
        ...history,
        { role: 'user', content: question },
      ];

      const rewriteModel = this.ollamaService.getRewriteModel();
      const response = await this.ollamaService.chat(rewritePrompt, rewriteModel);
      const reformulated = response?.message?.content?.trim();

      if (reformulated && reformulated.length > 0) {
        this.logger.debug(`Query reformulated: "${question}" -> "${reformulated}"`);
        return reformulated;
      }

      return question;
    } catch (error) {
      this.logger.warn(`Failed to rewrite query, falling back to original question: ${error}`);
      return question;
    }
  }

  /**
   * @description Build the final prompt and stream the response
   * @param {string} question - Current user question
   * @param {any[]} contextChunks - Chunks retrieved from pgvector
   * @param {Array<{ role: 'user' | 'assistant'; content: string }>} history - Prior chat history
   */
  async generateResponseStream(
    question: string,
    contextChunks: any[],
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ) {
    //? Construct the context string from retrieved chunks
    const contextText = contextChunks
      .map(
        (c) =>
          `[Source: Chunk ${c.chunkIndex} of Doc ${c.versionId || c.documentId}]\n${c.content}`,
      )
      .join('\n\n---\n\n');

    //* Build the System Prompt
    const systemInstructions = getSystemInstructions(contextText);

    //* Assemble the full message list for the Chat API
    //* Format: [System, ...History, Current Question]
    const messages = [systemInstructions, ...history, { role: 'user', content: question }];

    //* Return the observable mapped for NestJS SSE format
    return this.ollamaService.streamChat(messages).pipe(
      map((chunk) => ({
        data: {
          content: chunk.message?.content || '',
          done: chunk.done,
          ...(chunk.done ? { sources: contextChunks.map((c) => c.versionId || c.documentId) } : {}),
        },
      })),
    );
  }
}
