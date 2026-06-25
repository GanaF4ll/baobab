import { Component, computed, EventEmitter, inject, input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { ConversationService } from '../../../features/conversations/services/conversation.service';
import { WorkspacesStateService } from '../../../features/workspaces/services/workspaces-state.service';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, HlmButton],
  templateUrl: './sidebar.component.html',
  styleUrls: [],
})
export class SidebarComponent {
  protected readonly sidebarService = inject(SidebarService);
  protected readonly state = inject(WorkspacesStateService);
  protected readonly conversationService = inject(ConversationService);

  readonly inWorkspace = input<boolean>(false);

  @Output() uploadClick = new EventEmitter<void>();

  protected readonly activeWorkspace = computed(() => {
    const id = this.state.activeWorkspaceId();
    if (!id) return null;
    return this.state.workspaces().find((w) => w.id === id) || null;
  });

  onUpload() {
    this.uploadClick.emit();
  }

  createNewConversation() {
    const title = prompt('Enter conversation title:');
    if (title && title.trim()) {
      this.conversationService.createConversation(title.trim());
    }
  }

  get isOpen() {
    return this.sidebarService.isOpen;
  }
}
