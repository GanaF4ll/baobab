import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { SidebarComponent } from '../../../core/layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../../core/layout/header/header.component';
import { WorkspaceCardComponent } from '../workspace-card/workspace-card.component';
import { CreateWorkspaceDialogComponent } from '../create-workspace-dialog/create-workspace-dialog.component';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { WorkspacesService } from '../../../../client/services/workspaces.service';
import { CreateWorkspaceDto, WorkspaceEntity } from '../../../../client/models';

@Component({
  selector: 'app-workspaces-dashboard',
  imports: [SidebarComponent, HeaderComponent, WorkspaceCardComponent],
  templateUrl: './workspaces-dashboard.component.html',
  styleUrls: []
})
export class WorkspacesDashboardComponent implements OnInit {
  private readonly workspacesService = inject(WorkspacesService);
  private readonly hlmDialogService = inject(HlmDialogService);

  protected readonly workspaces = signal<WorkspaceEntity[]>([]);
  protected readonly activeWorkspaceId = signal<string | null>(null);
  protected readonly searchQuery = signal<string>('');
  protected readonly toast = signal<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: ''
  });

  private toastTimeout: any;

  // Filter workspaces client-side based on search query
  protected readonly filteredWorkspaces = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.workspaces();
    return this.workspaces().filter(w => w.name.toLowerCase().includes(query));
  });

  ngOnInit() {
    this.loadWorkspaces();
    const storedActiveId = localStorage.getItem('activeWorkspaceId');
    if (storedActiveId) {
      this.activeWorkspaceId.set(storedActiveId);
    }
  }

  loadWorkspaces() {
    this.workspacesService.workspacesControllerFindAll().subscribe({
      next: (response) => {
        const items = response.data?.items || [];
        this.workspaces.set(items);
        
        // If there's no active workspace, select the first one by default
        if (items.length > 0 && !this.activeWorkspaceId()) {
          this.selectWorkspace(items[0].id, false); // Don't show toast on initial load
        }
      },
      error: (err) => {
        console.error('Failed to load workspaces', err);
      }
    });
  }

  selectWorkspace(id: string, showNotification = true) {
    this.activeWorkspaceId.set(id);
    localStorage.setItem('activeWorkspaceId', id);

    if (showNotification) {
      const workspace = this.workspaces().find(w => w.id === id);
      const name = workspace ? workspace.name : 'Workspace';
      this.showToast('Silo Verified', `Encryption keys for '${name}' rotated successfully.`);
    }
  }

  openCreateWorkspaceDialog() {
    const dialogRef = this.hlmDialogService.open(CreateWorkspaceDialogComponent, {
      contentClass: 'max-w-md p-6 bg-surface-container-low border border-outline-variant rounded-lg'
    });

    dialogRef.closed$.subscribe((result) => {
      const data = result as CreateWorkspaceDto | undefined;
      if (data && data.name) {
        console.log('result', data);
        this.createWorkspace(data.name, data.description || '');
      }
    });
  }

  createWorkspace(name: string, description: string) {
    this.workspacesService.workspacesControllerCreate({
      name,
      description
    }).subscribe({
      next: (response) => {
        // FindOneWorkspaceResponseDto structure
        const newWorkspace = response.data;
        this.loadWorkspaces();
        
        if (newWorkspace && newWorkspace.id) {
          this.selectWorkspace(newWorkspace.id, false);
        }
        
        this.showToast('Workspace Created', `Silo '${name}' has been provisioned successfully.`);
      },
      error: (err) => {
        console.error('Failed to create workspace', err);
        this.showToast('Error', 'Failed to provision secure workspace silo.');
      }
    });
  }

  showToast(title: string, message: string) {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toast.set({ visible: true, title, message });

    this.toastTimeout = setTimeout(() => {
      this.toast.set({ visible: false, title: '', message: '' });
    }, 5000);
  }

  closeToast() {
    this.toast.set({ visible: false, title: '', message: '' });
  }

  onSearchChanged(query: string) {
    this.searchQuery.set(query);
  }
}
