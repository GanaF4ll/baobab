import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RAG_SWAGGER_TAG } from 'src/swagger.config';
import { RagService } from './rag.service';
import { FastifyReply } from 'fastify';

@Controller('rag')
@ApiTags(RAG_SWAGGER_TAG)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ask')
  async ask(
    @Body() askDto: { question: string; documentIds: string[]; history: any[] },
    @Res() res: FastifyReply,
  ) {
    //? simulate SSE / Streaming behaviour
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');

    const chunks = await this.ragService.searchSimilarChunks(askDto.question, askDto.documentIds);
    const stream$ = await this.ragService.generateResponseStream(
      askDto.question,
      chunks,
      askDto.history,
    );

    stream$.subscribe({
      next: (chunk) => {
        res.raw.write(`data: ${JSON.stringify(chunk.data)}\n\n`);
      },
      error: (err) => {
        console.error('Stream error:', err);
        res.raw.write(`data: {"error": "Stream failed"}\n\n`);
        res.raw.end();
      },
      complete: () => {
        res.raw.end();
      },
    });
  }
}
