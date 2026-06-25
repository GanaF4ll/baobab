import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConversationsResource } from '../../../../client/resources/conversations.resource';
import { ConversationsService } from '../../../../client/services/conversations.service';
import { WorkspacesStateService } from '../../workspaces/services/workspaces-state.service';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private readonly conversationsResource = inject(ConversationsResource);
  private readonly conversationsService = inject(ConversationsService);
  private readonly workspacesStateService = inject(WorkspacesStateService);
  private readonly router = inject(Router);

  // Dynamic signal based on the active workspace ID
  private readonly activeWorkspaceId = computed(() => this.workspacesStateService.activeWorkspaceId() || '');

  // Resource that fetches conversations reactively when activeWorkspaceId changes
  public readonly conversationsQuery = this.conversationsResource.conversationsControllerFindAll(
    this.activeWorkspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      defaultValue: { data: { items: [], nextCursor: null, totalCount: 0 } },
    }
  );

  public readonly conversations = computed(() => this.conversationsQuery.value()?.data?.items || []);
  public readonly isLoading = computed(() => this.conversationsQuery.isLoading());

  createConversation(title: string) {
    const workspaceId = this.activeWorkspaceId();
    if (!workspaceId) return;

    this.conversationsService.conversationsControllerCreate({
      workspaceId,
      title
    }).subscribe({
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
      }
    });
  }
}
