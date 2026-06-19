import { RagService } from './../rag/rag.service';
import { Controller, Get, Post, Body, Patch, Param, Delete, Res } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/input/create-conversation.dto';
import { UpdateConversationDto } from './dto/input/update-conversation.dto';
import { FastifyReply } from 'fastify';
import { AskLlmDto } from 'src/rag/dto/input/ask-llm.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly ragService: RagService,
  ) {}

  @Post()
  create(@Body() createConversationDto: CreateConversationDto) {
    return this.conversationsService.create(createConversationDto);
  }

  @Post(':id/ask')
  async ask(@Body() askDto: AskLlmDto, @Res() res: FastifyReply, @Param('id') id: string) {
    //? simulate SSE / Streaming behaviour
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');

    const chunks = await this.ragService.searchSimilarChunks(askDto.question, askDto.versionIds);
    const stream$ = await this.ragService.generateResponseStream(askDto.question, chunks);

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

  @Get()
  findAll() {
    return this.conversationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConversationDto: UpdateConversationDto) {
    return this.conversationsService.update(+id, updateConversationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conversationsService.remove(+id);
  }
}
