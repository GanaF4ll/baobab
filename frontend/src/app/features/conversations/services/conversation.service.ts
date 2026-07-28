import { computed, inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { RagStreamChunkResponseDto } from '../../../../client/models';
import { ConversationsResource } from '../../../../client/resources/conversations.resource';
import { ConversationsService } from '../../../../client/services/conversations.service';
import { BASE_PATH_DEFAULT } from '../../../../client/tokens';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspacesStateService } from '../../workspaces/services/workspaces-state.service';

@Service()
export class ConversationService {
  private readonly conversationsResource = inject(ConversationsResource);
  private readonly conversationsService = inject(ConversationsService);
  private readonly workspacesStateService = inject(WorkspacesStateService);
  private readonly authService = inject(AuthService);
  private readonly basePath = inject(BASE_PATH_DEFAULT);
  private readonly router = inject(Router);

  // Dynamic signal based on the active workspace ID
  private readonly activeWorkspaceId = computed(
    () => this.workspacesStateService.activeWorkspaceId() || '',
  );

  // Resource that fetches conversations reactively when activeWorkspaceId changes
  public readonly conversationsQuery = this.conversationsResource.conversationsControllerFindAll(
    this.activeWorkspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      defaultValue: { data: { items: [], nextCursor: null, totalCount: 0 } },
    },
  );

  public readonly conversations = computed(
    () => this.conversationsQuery.value()?.data?.items || [],
  );
  public readonly isLoading = computed(() => this.conversationsQuery.isLoading());

  createConversation(title: string) {
    const workspaceId = this.activeWorkspaceId();
    if (!workspaceId) return;

    this.conversationsService
      .conversationsControllerCreate({
        workspaceId,
        title,
      })
      .subscribe({
        next: (response: any) => {
          // reload the query
          this.conversationsQuery.reload();
          // navigate to the new conversation
          if (response.data?.id) {
            this.router.navigate(['/workspace', workspaceId, 'conversation', response.data.id]);
          }
        },
        error: (err) => {
          console.error('Failed to create conversation', err);
        },
      });
  }

  /**
   * Stream LLM response chunk by chunk using fetch & ReadableStream
   */
  async *askStream(
    workspaceId: string,
    conversationId: string,
    question: string,
    versionIds: string[] = [],
  ): AsyncIterable<RagStreamChunkResponseDto> {
    const token = this.authService.accessToken();
    const url = `${this.basePath}/conversations/${workspaceId}/ask/${conversationId}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, versionIds }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP error ${response.status}: ${errText || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported on response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let jsonStr = trimmed;
        if (trimmed.startsWith('data:')) {
          jsonStr = trimmed.slice(5).trim();
        }

        if (jsonStr === '[DONE]') continue;

        try {
          const chunk: RagStreamChunkResponseDto = JSON.parse(jsonStr);
          yield chunk;
        } catch {
          yield { content: trimmed, done: false };
        }
      }
    }

    if (buffer.trim()) {
      const trimmed = buffer.trim();
      const jsonStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
      if (jsonStr !== '[DONE]') {
        try {
          const chunk: RagStreamChunkResponseDto = JSON.parse(jsonStr);
          yield chunk;
        } catch {
          yield { content: trimmed, done: false };
        }
      }
    }
  }
}
