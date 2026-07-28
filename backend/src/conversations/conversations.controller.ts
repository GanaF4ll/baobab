import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Protected } from 'src/auth/decorators/protected.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AskLlmDto } from 'src/rag/dto/input/ask-llm.dto';
import { RagStreamChunkResponseDto } from 'src/rag/dto/output/rag-steam-chunk-response.dto';
import { FilterDto } from 'src/shared/dto/input/filter.dto';
import { ApiCollectionResponseDto } from 'src/shared/dto/output/api-collection-response.dto';
import { ApiResponseDto } from 'src/shared/dto/output/api-response.dto';
import { WorkspaceMemberGuard } from 'src/workspaces/guards/workspace-member.guard';
import { RagService } from './../rag/rag.service';
import { ConversationsService } from './conversations.service';
import { ConversationFilterDto } from './dto/input/conversation-filter.dto';
import { CreateConversationDto } from './dto/input/create-conversation.dto';
import { UpdateConversationDto } from './dto/input/update-conversation.dto';
import {
  ConversationCollectionData,
  ConversationCollectionResponseDto,
} from './dto/output/conversation-collection-response.dto';
import { findNextMessagesResponseDto } from './dto/output/find-next-messages-response.dto';
import { MessageResponseDto } from './dto/output/find-one-conversation-response.dto';
import { ConversationEntity } from './entities/conversation.entity';

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
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiCreatedResponse({ type: ApiResponseDto<ConversationEntity> })
  @ApiBadRequestResponse({ description: 'Invalid query params' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<ConversationEntity>> {
    const conversation = await this.conversationsService.create(createConversationDto, userId);
    return {
      data: conversation,
    };
  }

  @Post(':workspaceId/ask/:conversationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WorkspaceMemberGuard)
  @ApiProduces('text/event-stream')
  @ApiOperation({ summary: 'Ask a question to the AI (Streaming SSE)' })
  @ApiOkResponse({
    description: 'SSE stream. Each "data" event contains this parsed JSON object.',
    type: RagStreamChunkResponseDto,
    schema: { format: 'text/event-stream' },
  })
  async ask(
    @Body() askDto: AskLlmDto,
    @Res() res: FastifyReply,
    @Param('conversationId') conversationId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    const origin = res.request?.headers?.origin;
    if (origin) {
      res.raw.setHeader('Access-Control-Allow-Origin', origin);
      res.raw.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.raw.statusCode = 200;
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');

    await this.conversationsService.saveMessage(
      conversationId,
      {
        content: askDto.question,
        role: 'user',
      },
      workspaceId,
    );

    const chunks = await this.ragService.searchSimilarChunks(askDto.question, askDto.versionIds);
    const stream$ = await this.ragService.generateResponseStream(askDto.question, chunks);

    let fullAiResponse = '';

    stream$.subscribe({
      next: (chunk) => {
        if (chunk.data?.content) {
          fullAiResponse += chunk.data.content;
        }
        res.raw.write(`data: ${JSON.stringify(chunk.data)}\n\n`);
      },
      error: (err) => {
        console.error('Stream error:', err);
        res.raw.write(`data: {"error": "Stream failed"}\n\n`);
        res.raw.end();
      },
      complete: async () => {
        try {
          const uniqueVersionIds = [...new Set(chunks.map((chunk) => chunk.versionId))];
          await this.conversationsService.saveMessage(
            conversationId,
            {
              content: fullAiResponse,
              role: 'assistant',
              sources: uniqueVersionIds,
            },
            workspaceId,
          );
        } catch (dbError) {
          console.error('Erreur lors de la sauvegarde de la réponse IA :', dbError);
        } finally {
          // 6. Quoi qu'il arrive (succès ou échec BDD), on ferme la connexion HTTP
          res.raw.end();
        }
      },
    });
  }

  @Post(':workspaceId/restore/:conversationId')
  @UseGuards(WorkspaceMemberGuard)
  @Protected()
  @ApiOperation({
    summary: 'Restores a single conversation from the archive, making it visible again',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  @ApiNoContentResponse({ description: 'Conversation restored successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async restore(
    @Param('conversationId') conversationId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ApiResponseDto<ConversationEntity>> {
    const data = await this.conversationsService.restore(conversationId, workspaceId);
    return {
      data,
    };
  }

  @Get(':workspaceId/collection')
  @UseGuards(WorkspaceMemberGuard)
  @Protected()
  @ApiOperation({
    summary: 'Retrieves all conversations for a workspace, ordered by creation date ascending.',
  })
  @ApiOkResponse({ type: ConversationCollectionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query params' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() filter: ConversationFilterDto,
  ): Promise<ApiCollectionResponseDto<ConversationCollectionData>> {
    const conversationList = await this.conversationsService.findAllByWorkspaceId(
      workspaceId,
      filter,
    );
    return {
      data: conversationList,
    };
  }

  @Get(':workspaceId/:id')
  @UseGuards(WorkspaceMemberGuard)
  @Protected()
  @ApiOperation({
    summary: 'Retrieves a single conversation, by ID, with its last 20 messages',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  async findOne(@Param('id') id: string, @Param('workspaceId') workspaceId: string) {
    const conv = await this.conversationsService.findOne(id, workspaceId);

    if (conv?.deletedAt) {
      throw new NotFoundException('Conversation not found');
    }
    return { data: conv };
  }

  @Get(':workspaceId/:id/messages')
  @UseGuards(WorkspaceMemberGuard)
  @Protected()
  @ApiOperation({
    summary:
      'Gets the messages of a conversation, ordered by creation date ascending. Paginates using the cursor.',
  })
  @ApiOkResponse({ type: findNextMessagesResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query params' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  async findNextMessages(
    @Param('id') conversationId: string,
    @Query() filter: FilterDto,
  ): Promise<ApiCollectionResponseDto<MessageResponseDto>> {
    const messageList = await this.conversationsService.findNextMessages(
      conversationId,
      filter.cursor,
    );
    return {
      data: messageList,
    };
  }

  @Patch(':workspaceId/:id')
  @UseGuards(WorkspaceMemberGuard)
  @Protected()
  @ApiOperation({ summary: 'Update the title of a conversation' })
  @ApiBadRequestResponse({ description: 'Invalid query params' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  @ApiNoContentResponse({ description: 'Conversation updated successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.conversationsService.update(id, updateConversationDto, workspaceId);
  }

  @Delete(':workspaceId/:id')
  @UseGuards(WorkspaceMemberGuard)
  @Protected()
  @ApiOperation({
    summary: 'Soft deletes a single conversation, making it hidden from lists but still restorable',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'You are not a member of this workspace' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  @ApiNoContentResponse({ description: 'Conversation deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id') id: string, @Param('workspaceId') workspaceId: string) {
    return this.conversationsService.softDelete(id, workspaceId);
  }
}
