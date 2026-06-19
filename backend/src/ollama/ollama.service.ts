import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;
  private readonly embeddingModel: string;
  private readonly chatModel: string;

  constructor(private configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.embeddingModel =
      this.configService.get<string>('OLLAMA_EMBED_MODEL') || 'nomic-embed-text';
    this.chatModel = this.configService.get<string>('OLLAMA_LLM_MODEL') || 'mistral:7b';
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

  /**
   * @description Call Ollama chat API in streaming mode
   * @param {any[]} messages - Array of chat messages { role, content }
   * @returns {Observable<any>} A stream of LLM response chunks
   */
  streamChat(messages: any[]): Observable<any> {
    return new Observable((observer) => {
      this.logger.debug(`Starting LLM stream using model: ${this.chatModel}`);

      //? We use the native fetch with a ReadableStream
      fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.chatModel,
          messages,
          stream: true,
        }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(response.statusText);

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) throw new Error('ReadableStream not supported');

          // Read the stream chunk by chunk
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            //? Ollama sends multiple JSON objects in one chunk sometimes (NDJSON)
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                observer.next(json);
                if (json.done) observer.complete();
              } catch (e) {
                this.logger.error('Error parsing stream line', e);
              }
            }
          }
        })
        .catch((err) => {
          this.logger.error('Ollama Stream Error', err);
          observer.error(err);
        });
    });
  }
}
