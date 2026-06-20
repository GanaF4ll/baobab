import { RagService } from './../rag/rag.service';
import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/input/create-conversation.dto';
import { UpdateConversationDto } from './dto/input/update-conversation.dto';
import { FastifyReply } from 'fastify';
import { AskLlmDto } from 'src/rag/dto/input/ask-llm.dto';
import { WorkspaceMemberGuard } from 'src/workspaces/guards/workspace-member.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Protected } from 'src/auth/decorators/protected.decorator';
import { ApiOkResponse, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { RagStreamChunkResponseDto } from 'src/rag/dto/output/rag-steam-chunk-response.dto';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly ragService: RagService,
  ) {}

  @Post()
  @UseGuards(WorkspaceMemberGuard)
  @Protected()
  create(@Body() createConversationDto: CreateConversationDto, @CurrentUser('id') userId: string) {
    return this.conversationsService.create(createConversationDto, userId);
  }

  @Post(':workspaceId/ask/:conversationId')
  @UseGuards(WorkspaceMemberGuard)
  @ApiProduces('text/event-stream')
  @ApiOperation({ summary: 'Ask a question to the AI (Streaming SSE)' })
  @ApiOkResponse({
    description: 'SSE stream. Each "data" event contains this parsed JSON object.',
    type: RagStreamChunkResponseDto,
    schema: { format: 'text/event-stream' },
  })
  async ask(@Body() askDto: AskLlmDto, @Res() res: FastifyReply) {
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
