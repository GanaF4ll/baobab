import {
  Component,
  computed,
  EventEmitter,
  HostListener,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { RenameConversationDialogComponent } from '../../../features/conversations/components/rename-conversation-dialog/rename-conversation-dialog.component';
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
  protected readonly hlmDialogService = inject(HlmDialogService);

  readonly inWorkspace = input<boolean>(false);
  protected readonly activeMenuConversation = signal<any | null>(null);
  protected readonly menuPosition = signal<{ top: number; left: number } | null>(null);

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

  toggleMenu(event: MouseEvent, conv: any) {
    if (this.activeMenuConversation()?.id === conv.id) {
      this.activeMenuConversation.set(null);
      this.menuPosition.set(null);
    } else {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.activeMenuConversation.set(conv);
      this.menuPosition.set({
        top: rect.bottom + 4, // 4px gap
        left: rect.left - 200 + rect.width, // 200px menu width
      });
    }
  }

  @HostListener('document:click')
  closeMenu() {
    this.activeMenuConversation.set(null);
  }

  shareConversation(conv: any) {
    console.log('Share conversation', conv.id);
  }

  pinConversation(conv: any) {
    console.log('Pin conversation', conv.id);
  }

  openRenameDialog(conv: any) {
    this.activeMenuConversation.set(null);
    const dialogRef = this.hlmDialogService.open(RenameConversationDialogComponent, {
      context: { conversationTitle: conv.title },
      contentClass:
        'max-w-md p-6 bg-surface-container-low border border-outline-variant rounded-lg',
    });

    dialogRef.closed$.subscribe((result) => {
      const title = result as string | undefined;
      if (title && title.trim() && title.trim() !== conv.title) {
        this.conversationService.renameConversation(conv.id, title.trim());
      }
    });
  }

  deleteConversation(conv: any) {
    this.activeMenuConversation.set(null);
    if (confirm('Voulez-vous vraiment supprimer cette conversation ?')) {
      this.conversationService.deleteConversation(conv.id);
    }
  }

  get isOpen() {
    return this.sidebarService.isOpen;
  }
}
