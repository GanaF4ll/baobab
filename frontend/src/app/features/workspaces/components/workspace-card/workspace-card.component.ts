import { DatePipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  inject,
  Output,
  signal,
} from '@angular/core';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { WorkspaceEntity } from '../../../../../client';
import { WorkspacesStateService } from '../../services/workspaces-state.service';
import { RenameWorkspaceDialogComponent } from '../rename-workspace-dialog/rename-workspace-dialog.component';
import { TrashWorkspaceDialogComponent } from '../trash-workspace-dialog/trash-workspace-dialog.component';

@Component({
  selector: 'app-workspace-card',
  imports: [DatePipe],
  templateUrl: './workspace-card.component.html',
  styleUrls: [],
  host: {
    class: 'block h-full',
  },
})
export class WorkspaceCardComponent {
  private readonly hlmDialogService = inject(HlmDialogService);
  private readonly state = inject(WorkspacesStateService);

  @Input({ required: true }) workspace!: WorkspaceEntity;
  @Output() selectWorkspace = new EventEmitter<string>();
  @Output() renameWorkspace = new EventEmitter<WorkspaceEntity>();
  @Output() deleteWorkspace = new EventEmitter<string>();

  protected readonly isMenuOpen = signal<boolean>(false);
  protected readonly menuPosition = signal<{ top: number; left: number } | null>(null);

  onSelect() {
    this.selectWorkspace.emit(this.workspace.id);
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (this.isMenuOpen()) {
      this.closeMenu();
    } else {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.menuPosition.set({
        top: rect.bottom + 4,
        left: rect.left - 180 + rect.width,
      });
      this.isMenuOpen.set(true);
    }
  }

  @HostListener('document:click')
  closeMenu() {
    this.isMenuOpen.set(false);
    this.menuPosition.set(null);
  }

  openRenameDialog(event: MouseEvent) {
    event.stopPropagation();
    this.closeMenu();
    this.renameWorkspace.emit(this.workspace);

    const dialogRef = this.hlmDialogService.open(RenameWorkspaceDialogComponent, {
      context: {
        workspaceName: this.workspace.name,
        workspaceDescription: this.workspace.description,
        workspaceIcon: this.workspace.icon,
      },
      contentClass:
        'max-w-md p-6 bg-surface-container-low border border-outline-variant rounded-lg',
    });

    dialogRef.closed$.subscribe((result) => {
      const data = result as { name: string; description?: string; icon?: string } | undefined;
      if (data?.name) {
        this.state.renameWorkspace(this.workspace.id, data.name, data.description, data.icon);
      }
    });
  }

  onDeleteWorkspace(event: MouseEvent) {
    event.stopPropagation();
    this.closeMenu();

    const dialogRef = this.hlmDialogService.open(TrashWorkspaceDialogComponent, {
      context: {
        workspaceName: this.workspace.name,
        workspaceIcon: this.workspace.icon,
        documentCount: this.workspace.documentCount ?? 0,
      },
      contentClass:
        'max-w-md p-6 bg-surface-container-low border border-outline-variant rounded-2xl shadow-xl',
    });

    dialogRef.closed$.subscribe((confirmed) => {
      if (confirmed) {
        this.deleteWorkspace.emit(this.workspace.id);
        this.state.deleteWorkspace(this.workspace.id);
      }
    });
  }
}
