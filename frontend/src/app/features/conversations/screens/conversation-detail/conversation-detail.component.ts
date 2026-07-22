import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  effect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { SidebarComponent } from '../../../../core/layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../../../core/layout/header/header.component';
import { UserMessageComponent } from '../../components/user-message/user-message.component';
import { ConversationsResource } from '../../../../../client/resources';
import { ConversationsService } from '../../../../../client';
import { WorkspacesStateService } from '../../../workspaces/services/workspaces-state.service';
import { SidebarService } from '../../../../core/services/sidebar.service';

@Component({
  selector: 'app-conversation-detail',
  imports: [SidebarComponent, HeaderComponent, RouterLink, DatePipe, UserMessageComponent],
  templateUrl: './conversation-detail.component.html',
  styleUrls: [],
})
export class ConversationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly conversationsResource = inject(ConversationsResource);
  private readonly conversationsService = inject(ConversationsService);
  protected readonly state = inject(WorkspacesStateService);
  protected readonly sidebarService = inject(SidebarService);
  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  // Extract params as signals
  private readonly idParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('conversationId') || '')),
    { initialValue: '' },
  );

  protected readonly workspaceIdParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') || '')),
    { initialValue: '' },
  );

  // Query conversation and last messages
  protected readonly conversationQuery = this.conversationsResource.conversationsControllerFindOne(
    this.idParam,
    this.workspaceIdParam,
    {
      defaultValue: undefined,
    },
  );

  protected readonly conversation = computed(() => this.conversationQuery.value()?.data as any);
  protected readonly isLoading = computed(() => this.conversationQuery.isLoading());
  protected readonly error = computed(() => this.conversationQuery.error());

  // Messages list state
  protected readonly loadedMessages = signal<any[]>([]);
  private readonly nextCursor = signal<string | null>(null);
  protected readonly isLoadingMore = signal(false);
  private hasMore = true;

  constructor() {
    // Synchronize initial messages when conversationQuery finishes loading
    effect(() => {
      const data = this.conversationQuery.value()?.data;
      if (data) {
        const initialMsgs = (data as any).messages || [];
        // The API returns newest first (descending), reverse it for chronological display
        const chronologicalMsgs = [...initialMsgs].reverse();
        this.loadedMessages.set(chronologicalMsgs);

        // Use the oldest message ID as the initial cursor for loading older messages
        if (initialMsgs.length > 0) {
          const oldest = initialMsgs[initialMsgs.length - 1];
          this.nextCursor.set(oldest.id);
          this.hasMore = initialMsgs.length >= 20; // assuming limit is 20
        } else {
          this.nextCursor.set(null);
          this.hasMore = false;
        }

        this.scrollToBottom();
      }
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const workspaceId = params.get('id');
      if (workspaceId) {
        this.state.selectWorkspace(workspaceId, false);
      }
    });
  }

  handleSidebarBottomClick() {
    this.state.showToast('Document Upload', 'Document upload placeholder triggered.');
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = this.messagesContainer()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  onScroll(event: Event) {
    const element = event.target as HTMLElement;
    // With standard scroll, scrollTop starts at 0 at the top (oldest messages)
    const isAtTop = element.scrollTop <= 20;
    if (isAtTop) {
      this.loadOlderMessages();
    }
  }

  loadOlderMessages() {
    if (this.isLoadingMore() || !this.hasMore) return;

    const conversationId = this.idParam();
    const cursor = this.nextCursor();
    if (!conversationId || !cursor) return;

    this.isLoadingMore.set(true);

    const container = this.messagesContainer()?.nativeElement;
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    this.conversationsService
      .conversationsControllerFindNextMessages(conversationId, 20, cursor, 'desc')
      .subscribe({
        next: (response: any) => {
          const newMsgs = response.data?.items || [];
          const nextC = response.data?.nextCursor;

          if (newMsgs.length > 0) {
            // The API returns newest first, reverse it for chronological prepending
            const chronologicalOlder = [...newMsgs].reverse();
            this.loadedMessages.update((msgs) => [...chronologicalOlder, ...msgs]);
            this.nextCursor.set(nextC || newMsgs[newMsgs.length - 1].id);
            this.hasMore = newMsgs.length >= 20;

            // Adjust scroll position to prevent jumping
            setTimeout(() => {
              const currentContainer = this.messagesContainer()?.nativeElement;
              if (currentContainer) {
                const newScrollHeight = currentContainer.scrollHeight;
                currentContainer.scrollTop =
                  newScrollHeight - previousScrollHeight + previousScrollTop;
              }
            }, 0);
          } else {
            this.hasMore = false;
          }
          this.isLoadingMore.set(false);
        },
        error: (err) => {
          console.error('Failed to load older messages', err);
          this.isLoadingMore.set(false);
        },
      });
  }

  sendMessage(event: Event, inputEl: HTMLInputElement) {
    event.preventDefault();
    const content = inputEl.value.trim();
    if (!content) return;

    inputEl.value = '';
    this.state.showToast(
      'Message Sent',
      'Your message has been processed by the secure RAG agent.',
    );
  }
}
