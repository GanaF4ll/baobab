import { computed, Injectable, inject, signal } from '@angular/core';
import { DocumentsResource } from '../../../../client/resources';
import { WorkspacesStateService } from '../../workspaces/services/workspaces-state.service';

@Injectable({
  providedIn: 'root',
})
export class DocumentsStateService {
  private readonly documentRessource = inject(DocumentsResource);
  private readonly workspacesStateService = inject(WorkspacesStateService);

  public readonly activeWorkspaceId = computed(
    () => this.workspacesStateService.activeWorkspaceId() || '',
  );

  public readonly activeDocumentId = signal<string | null>(
    localStorage.getItem('activeDocumentId'),
  );

  public readonly searchQuery = signal<string>('');
  public readonly toast = signal<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  public readonly documentsQuery = this.documentRessource.documentsControllerFindAllByWorkspace(
    this.activeWorkspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      defaultValue: { data: { items: [], nextCursor: null, totalCount: 0 } },
    },
  );

  public readonly documents = computed(() => this.documentsQuery.value()?.data?.items || []);
  public readonly filteredDocuments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.documents();
    return this.documents().filter((d: any) => d.name.toLowerCase().includes(query));
  });
}
