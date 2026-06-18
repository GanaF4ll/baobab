import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;
  private readonly embeddingModel: string;

  constructor(private configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.embeddingModel =
      this.configService.get<string>('OLLAMA_EMBED_MODEL') || 'nomic-embed-text';
  }

  /**
   * @description Generates embeddings for a batch of text chunks
   * @param texts Array of text chunks
   * @returns Array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      this.logger.debug(
        `Génération d'embeddings pour ${texts.length} chunks via ${this.embeddingModel}...`,
      );

      const response = await fetch(`${this.ollamaUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('embeddings ', data.embeddings);
      return data.embeddings;
    } catch (error) {
      this.logger.error('Erreur lors de la communication avec Ollama', error);
      throw new HttpException(
        'Erreur lors de la génération des embeddings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Generates embedding for a single text chunk, like the user's prompt
   * @param text
   * @returns
   */
  async generateSingleEmbedding(text: string): Promise<number[]> {
    return await this.generateEmbeddings([text]).then((embeddings) => embeddings[0]);
  }
}
