import { HttpParams, httpResource } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { ConversationsService } from '../../../../client/services/conversations.service';
import { DocumentsService } from '../../../../client/services/documents.service';
import { WorkspacesService } from '../../../../client/services/workspaces.service';
import { BASE_PATH_DEFAULT } from '../../../../client/tokens';
import { ConversationService } from '../../conversations/services/conversation.service';
import { WorkspacesStateService } from '../../workspaces/services/workspaces-state.service';
import { RessourceTypeFilter, TrashCollectionResponse, TrashItem } from '../models/trash.model';

@Injectable({
  providedIn: 'root',
})
export class TrashStateService {
  private readonly basePath = inject(BASE_PATH_DEFAULT);
  private readonly workspacesService = inject(WorkspacesService);
  private readonly documentsService = inject(DocumentsService);
  private readonly conversationsService = inject(ConversationsService);
  private readonly workspacesStateService = inject(WorkspacesStateService);
  private readonly conversationService = inject(ConversationService);

  public readonly searchQuery = signal<string>('');
  public readonly selectedType = signal<RessourceTypeFilter | 'ALL'>('ALL');
  public readonly sortOrder = signal<'asc' | 'desc'>('desc');
  public readonly toast = signal<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
  });

  private toastTimeout: any;

  public readonly trashQuery = httpResource<TrashCollectionResponse>(
    () => {
      let params = new HttpParams();

      const search = this.searchQuery().trim();
      if (search) {
        params = params.set('search', search);
      }

      const type = this.selectedType();
      if (type !== 'ALL') {
        params = params.set('ressourceType', type);
      }

      const order = this.sortOrder();
      if (order) {
        params = params.set('order', order);
      }

      params = params.set('limit', '50');

      return {
        url: `${this.basePath}/trash`,
        method: 'GET',
        params,
      };
    },
    {
      defaultValue: {
        data: {
          items: [],
          totalCount: 0,
          nextCursor: null,
        },
      },
    },
  );

  public readonly trashItems = computed(() => this.trashQuery.value()?.data?.items || []);
  public readonly totalCount = computed(() => this.trashQuery.value()?.data?.totalCount || 0);
  public readonly isLoading = computed(() => this.trashQuery.isLoading());

  public readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.selectedType() !== 'ALL';
  });

  restoreItem(item: TrashItem) {
    if (item.type === 'workspace') {
      this.workspacesService.workspacesControllerRestore(item.id).subscribe({
        next: () => {
          this.trashQuery.reload();
          this.workspacesStateService.workspacesQuery.reload();
          this.showToast(
            'Workspace restauré',
            `Le workspace "${item.title}" a été restauré avec succès.`,
          );
        },
        error: (err) => {
          console.error('Failed to restore workspace', err);
          this.showToast('Erreur', 'Impossible de restaurer le workspace.', 'error');
        },
      });
    } else if (item.type === 'document') {
      if (!item.workspaceId) {
        this.showToast('Erreur', 'Identifiant de workspace manquant pour ce document.', 'error');
        return;
      }

      this.documentsService
        .documentsControllerRestoreDocument({
          id: item.id,
          workspaceId: item.workspaceId,
        })
        .subscribe({
          next: () => {
            this.trashQuery.reload();
            this.showToast(
              'Document restauré',
              `Le document "${item.title}" a été restauré avec succès.`,
            );
          },
          error: (err) => {
            console.error('Failed to restore document', err);
            this.showToast('Erreur', 'Impossible de restaurer le document.', 'error');
          },
        });
    } else if (item.type === 'conversation') {
      if (!item.workspaceId) {
        this.showToast(
          'Erreur',
          'Identifiant de workspace manquant pour cette conversation.',
          'error',
        );
        return;
      }

      this.conversationsService
        .conversationsControllerRestore(item.id, item.workspaceId)
        .subscribe({
          next: () => {
            this.trashQuery.reload();
            this.conversationService.conversationsQuery.reload();
            this.showToast(
              'Conversation restaurée',
              `La conversation "${item.title}" a été restaurée avec succès.`,
            );
          },
          error: (err) => {
            console.error('Failed to restore conversation', err);
            this.showToast('Erreur', 'Impossible de restaurer la conversation.', 'error');
          },
        });
    }
  }

  permanentlyDeleteItem(item: TrashItem) {
    if (item.type !== 'document') {
      return;
    }

    if (!item.workspaceId) {
      this.showToast('Erreur', 'Identifiant de workspace manquant pour ce document.', 'error');
      return;
    }

    this.documentsService
      .documentsControllerRemoveDocument({
        id: item.id,
        workspaceId: item.workspaceId,
      })
      .subscribe({
        next: () => {
          this.trashQuery.reload();
          this.showToast(
            'Document supprimé définitivement',
            `Le document "${item.title}" a été supprimé de manière permanente.`,
          );
        },
        error: (err) => {
          console.error('Failed to permanently delete document', err);
          this.showToast('Erreur', 'Impossible de supprimer définitivement le document.', 'error');
        },
      });
  }

  setSearchQuery(q: string) {
    this.searchQuery.set(q);
  }

  setSelectedType(type: RessourceTypeFilter | 'ALL') {
    this.selectedType.set(type);
  }

  toggleSortOrder() {
    this.sortOrder.update((curr) => (curr === 'desc' ? 'asc' : 'desc'));
  }

  setSortOrder(order: 'asc' | 'desc') {
    this.sortOrder.set(order);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedType.set('ALL');
  }

  showToast(title: string, message: string, type: 'success' | 'error' | 'info' = 'success') {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toast.set({ visible: true, title, message, type });

    this.toastTimeout = setTimeout(() => {
      this.closeToast();
    }, 5000);
  }

  closeToast() {
    this.toast.set({ visible: false, title: '', message: '' });
  }
}
