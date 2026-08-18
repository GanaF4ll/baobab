import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { WorkspacesResource } from '../../../../client/resources/workspaces.resource';
import { WorkspacesService } from '../../../../client/services/workspaces.service';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class WorkspacesStateService {
  private readonly workspacesService = inject(WorkspacesService);
  private readonly workspacesResource = inject(WorkspacesResource);
  private readonly authService = inject(AuthService);

  public readonly activeWorkspaceId = signal<string | null>(
    localStorage.getItem('activeWorkspaceId'),
  );
  public readonly searchQuery = signal<string>('');
  public readonly toast = signal<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  public readonly workspacesQuery = this.workspacesResource.workspacesControllerFindAll(
    undefined,
    undefined,
    undefined,
    undefined,
    {
      defaultValue: { data: { items: [], nextCursor: null, totalCount: 0 } },
    },
  );

  public readonly workspaces = computed(() => this.workspacesQuery.value().data?.items || []);

  private toastTimeout: any;

  // Filter workspaces client-side based on search query
  public readonly filteredWorkspaces = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.workspaces();
    return this.workspaces().filter((w) => w.name.toLowerCase().includes(query));
  });

  constructor() {
    effect(
      () => {
        const isAuth = this.authService.isAuthenticated();
        if (isAuth) {
          this.workspacesQuery.reload();
        } else {
          this.activeWorkspaceId.set(null);
          localStorage.removeItem('activeWorkspaceId');
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const items = this.workspaces();
        if (items.length > 0 && !this.activeWorkspaceId()) {
          this.selectWorkspace(items[0].id, false);
        }
      },
      { allowSignalWrites: true },
    );
  }

  selectWorkspace(id: string, showNotification = true) {
    this.activeWorkspaceId.set(id);
    localStorage.setItem('activeWorkspaceId', id);

    if (showNotification) {
      const workspace = this.workspaces().find((w) => w.id === id);
      const name = workspace ? workspace.name : 'Workspace';
      this.showToast('Silo Verified', `Encryption keys for '${name}' rotated successfully.`);
    }
  }

  createWorkspace(name: string, description: string, icon?: string) {
    return this.workspacesService
      .workspacesControllerCreate({
        name,
        description,
        icon,
      })
      .subscribe({
        next: (response) => {
          const newWorkspace = response.data;
          this.workspacesQuery.reload();

          if (newWorkspace?.id) {
            this.selectWorkspace(newWorkspace.id, false);
          }

          this.showToast('Workspace Created', `Silo '${name}' has been provisioned successfully.`);
        },
        error: (err) => {
          console.error('Failed to create workspace', err);
          this.showToast('Error', 'Failed to provision secure workspace silo.');
        },
      });
  }

  renameWorkspace(id: string, name: string, description?: string, icon?: string) {
    return this.workspacesService
      .workspacesControllerUpdate(id, { name, description, icon })
      .subscribe({
        next: () => {
          this.workspacesQuery.reload();
          this.showToast('Workspace Mis à Jour', `Le workspace '${name}' a été mis à jour.`);
        },
        error: (err) => {
          console.error('Failed to update workspace', err);
          this.showToast('Erreur', 'Impossible de mettre à jour le workspace.');
        },
      });
  }

  deleteWorkspace(id: string) {
    const workspace = this.workspaces().find((w) => w.id === id);
    const name = workspace ? workspace.name : 'Workspace';
    return this.workspacesService.workspacesControllerRemove(id).subscribe({
      next: () => {
        if (this.activeWorkspaceId() === id) {
          this.activeWorkspaceId.set(null);
          localStorage.removeItem('activeWorkspaceId');
        }
        this.workspacesQuery.reload();
        this.showToast('Workspace Supprimé', `Le workspace '${name}' a été supprimé.`);
      },
      error: (err) => {
        console.error('Failed to delete workspace', err);
        this.showToast('Erreur', 'Impossible de supprimer le workspace.');
      },
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

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
  }
}
