import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { DocumentEntity, DocumentVersionEntity } from '../../../../../client/models';
import { DocumentsResource } from '../../../../../client/resources';
import { BASE_PATH_DEFAULT } from '../../../../../client/tokens';
import { WorkspacesStateService } from '../../../workspaces/services/workspaces-state.service';

@Component({
  selector: 'app-sources-panel',
  standalone: true,
  imports: [HlmCheckbox, FormsModule],
  templateUrl: './sources-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourcesPanelComponent {
  public readonly workspaceId = input.required<string>();
  public readonly selectedVersionIdsChange = output<string[]>();
  public readonly closePanel = output<void>();

  private readonly documentResource = inject(DocumentsResource);
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH_DEFAULT);
  private readonly state = inject(WorkspacesStateService);

  // Uploading state
  public readonly isUploading = signal(false);

  // Fetch documents for the workspace
  public readonly documentsQuery = this.documentResource.documentsControllerFindAllByWorkspace(
    this.workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      defaultValue: { data: { items: [], nextCursor: null, totalCount: 0 } },
    },
  );

  public readonly documents = computed<DocumentEntity[]>(
    () => (this.documentsQuery.value()?.data?.items as DocumentEntity[]) || [],
  );
  public readonly isLoading = computed(() => this.documentsQuery.isLoading());
  public readonly error = computed(() => this.documentsQuery.error());

  // Search filter
  public readonly searchQuery = signal<string>('');

  // Checked version IDs
  public readonly checkedVersionIds = signal<Set<string>>(new Set());

  private initialized = false;

  constructor() {
    effect(() => {
      const docs = this.documents();
      if (docs.length > 0 && !this.initialized) {
        this.initialized = true;
        const initialChecked = new Set<string>();

        for (const doc of docs) {
          const versions = doc.versions || [];
          const latestVersion =
            versions.find((v: DocumentVersionEntity) => v.versionNumber === doc.currentVersion) ||
            versions[0];

          if (latestVersion?.id) {
            initialChecked.add(latestVersion.id);
          }
        }

        this.checkedVersionIds.set(initialChecked);
        this.emitSelectedVersionIds();
      }
    });
  }

  public readonly filteredDocuments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const docs = this.documents();
    if (!query) return docs;
    return docs.filter((d) => d.title.toLowerCase().includes(query));
  });

  public readonly allVersions = computed<DocumentVersionEntity[]>(() => {
    return this.documents().flatMap((d) => d.versions || []);
  });

  public readonly selectedVersionCount = computed(() => this.checkedVersionIds().size);
  public readonly totalVersionCount = computed(() => this.allVersions().length);

  public readonly selectedCount = computed(() => this.selectedVersionCount());
  public readonly totalCount = computed(() => this.totalVersionCount());

  public readonly isAllSelected = computed(() => {
    const total = this.totalVersionCount();
    if (total === 0) return false;
    return this.checkedVersionIds().size === total;
  });

  public readonly isSomeSelected = computed(() => {
    const total = this.totalVersionCount();
    if (total === 0) return false;
    const size = this.checkedVersionIds().size;
    return size > 0 && size < total;
  });

  isVersionChecked(versionId: string): boolean {
    return this.checkedVersionIds().has(versionId);
  }

  toggleVersion(versionId: string, checked: boolean) {
    const next = new Set(this.checkedVersionIds());
    if (checked) {
      next.add(versionId);
    } else {
      next.delete(versionId);
    }
    this.checkedVersionIds.set(next);
    this.emitSelectedVersionIds();
  }

  isDocActive(doc: DocumentEntity): boolean {
    const versions = doc.versions || [];
    if (versions.length === 0) return false;
    const checked = this.checkedVersionIds();
    return versions.some((v) => checked.has(v.id));
  }

  isDocChecked(doc: DocumentEntity): boolean {
    const versions = doc.versions || [];
    if (versions.length === 0) return false;
    const checked = this.checkedVersionIds();
    return versions.every((v) => checked.has(v.id));
  }

  isDocIndeterminate(doc: DocumentEntity): boolean {
    const versions = doc.versions || [];
    if (versions.length === 0) return false;
    const checked = this.checkedVersionIds();
    const count = versions.filter((v) => checked.has(v.id)).length;
    return count > 0 && count < versions.length;
  }

  toggleDoc(doc: DocumentEntity, checked?: boolean) {
    const next = new Set(this.checkedVersionIds());
    const versions = doc.versions || [];
    // If any version is currently active, toggle off all; otherwise toggle on all.
    const shouldCheck = typeof checked === 'boolean' ? checked : !this.isDocActive(doc);

    for (const v of versions) {
      if (shouldCheck) {
        next.add(v.id);
      } else {
        next.delete(v.id);
      }
    }
    this.checkedVersionIds.set(next);
    this.emitSelectedVersionIds();
  }

  toggleSelectAll(checked?: boolean) {
    const docs = this.documents();
    const next = new Set<string>();
    const shouldCheck = typeof checked === 'boolean' ? checked : !this.isAllSelected();
    if (shouldCheck) {
      for (const doc of docs) {
        const versions = doc.versions || [];
        for (const v of versions) {
          next.add(v.id);
        }
      }
    }
    this.checkedVersionIds.set(next);
    this.emitSelectedVersionIds();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadFile(file);
      input.value = '';
    }
  }

  uploadFile(file: File) {
    const workspaceId = this.workspaceId();
    if (!workspaceId) return;

    this.isUploading.set(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspaceId);

    this.http.post(`${this.basePath}/documents`, formData, { withCredentials: true }).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.documentsQuery.reload();
        this.state.showToast('Document Uploaded', `'${file.name}' added successfully.`);
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Failed to upload document', err);
        this.state.showToast('Upload Failed', `Could not upload '${file.name}'.`);
      },
    });
  }

  private emitSelectedVersionIds() {
    this.selectedVersionIdsChange.emit(Array.from(this.checkedVersionIds()));
  }

  getDocIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') {
      return 'picture_as_pdf';
    }
    if (mimeType === 'text/markdown') {
      return 'article';
    }
    return 'description';
  }
}
