import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  effect,
  resource,
  linkedSignal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { SidebarComponent } from '../../../../core/layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../../../core/layout/header/header.component';
import { DocumentsResource } from '../../../../../client/resources';
import { DocumentsService } from '../../../../../client';
import { BASE_PATH_DEFAULT } from '../../../../../client/tokens';
import { WorkspacesStateService } from '../../../workspaces/services/workspaces-state.service';
import { SidebarService } from '../../../../core/services/sidebar.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-document-detail',
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, SidebarComponent, HeaderComponent],
  templateUrl: './document-detail.component.html',
  styleUrl: './document-detail.component.css',
})
export class DocumentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly documentsResource = inject(DocumentsResource);
  private readonly documentsService = inject(DocumentsService);
  protected readonly state = inject(WorkspacesStateService);
  protected readonly sidebarService = inject(SidebarService);
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH_DEFAULT);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);

  // Router parameters as signals
  protected readonly workspaceIdParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') || '')),
    { initialValue: '' },
  );

  protected readonly documentIdParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('documentId') || '')),
    { initialValue: '' },
  );

  // Fetch document with versions
  protected readonly documentQuery = this.documentsResource.documentsControllerFindOne(
    this.documentIdParam,
    { defaultValue: undefined },
  );

  protected readonly document = computed(() => this.documentQuery.value()?.data);
  protected readonly isLoading = computed(() => this.documentQuery.isLoading());
  protected readonly error = computed(() => this.documentQuery.error());

  // Versions state
  protected readonly versions = computed(() => this.document()?.versions || []);

  protected readonly currentVersionNumber = computed(() => this.document()?.currentVersion || 1);

  protected readonly currentVersion = computed(() => {
    return this.versions().find((v: any) => v.versionNumber === this.currentVersionNumber());
  });

  // Selected version signal, defaults to current
  protected readonly selectedVersionId = signal<string | null>(null);

  protected readonly selectedVersion = computed(() => {
    const vId = this.selectedVersionId();
    if (!vId) return this.currentVersion();
    return this.versions().find((v: any) => v.id === vId);
  });

  protected readonly isLatestSelected = computed(() => {
    const sel = this.selectedVersion();
    const cur = this.currentVersion();
    return !!(sel && cur && sel.id === cur.id);
  });

  // Reactively fetch document text content (Markdown or PDF text)
  protected readonly documentContentResource = resource<
    string,
    { docId: string; versionId: string } | null
  >({
    params: () => {
      const doc = this.document();
      const version = this.selectedVersion();
      if (doc && version) {
        return { docId: doc.id, versionId: version.id };
      }
      return null;
    },
    loader: async ({ params }) => {
      if (!params) return '';
      const response = await firstValueFrom(
        this.documentsService.documentsControllerGetVersionContent(params.docId, params.versionId),
      );
      return (response as any).content || '';
    },
  });

  // Writable signal for the editor text, linked to the loaded content
  protected readonly editedText = linkedSignal<string>(
    () => this.documentContentResource.value() || '',
  );

  protected readonly isEditMode = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);
  protected readonly activeTab = signal<'visual' | 'text'>('visual');

  // Document Title Editing State
  protected readonly isEditingTitle = signal<boolean>(false);
  protected readonly editedTitle = signal<string>('');
  protected readonly isSavingTitle = signal<boolean>(false);

  constructor() {
    // Select workspace and active document
    effect(() => {
      const docId = this.documentIdParam();
      if (docId) {
        localStorage.setItem('activeDocumentId', docId);
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const workspaceId = params.get('id');
      if (workspaceId) {
        this.state.selectWorkspace(workspaceId, false);
      }
    });
  }

  handleSidebarBottomClick() {
    this.state.showToast(
      'Document Upload',
      'Please use the workspaces or documents dashboard to upload new items.',
    );
  }

  // Safe PDF Resource Url
  protected readonly safePdfUrl = computed<SafeResourceUrl | null>(() => {
    const version = this.selectedVersion();
    const doc = this.document();
    const token = this.authService.accessToken();
    if (doc?.mimeType === 'application/pdf' && version && token) {
      const url = `${this.basePath}/documents/${doc.id}/versions/${version.id}/file?token=${token}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return null;
  });

  // Title edit controls
  startEditTitle() {
    const doc = this.document();
    if (doc) {
      this.editedTitle.set(doc.title);
      this.isEditingTitle.set(true);
    }
  }

  cancelEditTitle() {
    this.isEditingTitle.set(false);
  }

  saveTitle() {
    const docId = this.documentIdParam();
    const title = this.editedTitle().trim();
    if (!docId || !title) return;

    this.isSavingTitle.set(true);
    this.documentsService.documentsControllerUpdate(docId, { title }).subscribe({
      next: () => {
        this.isEditingTitle.set(false);
        this.isSavingTitle.set(false);
        this.state.showToast('Title Saved', 'Document title updated successfully.');
        this.documentQuery.reload();
      },
      error: (err) => {
        console.error('Title update failed:', err);
        this.state.showToast('Update Failed', 'Could not update document title.');
        this.isSavingTitle.set(false);
      },
    });
  }

  // Content edit controls
  toggleEditMode() {
    if (!this.isLatestSelected()) {
      this.state.showToast(
        'Read-only',
        'Historical versions cannot be modified. Edit the latest version.',
      );
      return;
    }
    this.isEditMode.update((mode) => !mode);
  }

  saveContent() {
    const workspaceId = this.workspaceIdParam();
    const docId = this.documentIdParam();
    const doc = this.document();
    if (!workspaceId || !docId || !doc) return;

    this.isSaving.set(true);
    this.state.showToast(
      'Saving Document',
      `Processing version ${this.versions().length + 1} with RAG parser...`,
    );

    const fileContent = this.editedText();
    const blob = new Blob([fileContent], { type: 'text/markdown' });
    const file = new File([blob], doc.title, { type: 'text/markdown' });

    const formData = new FormData();
    formData.append('workspaceId', workspaceId);
    formData.append('file', file);
    formData.append('id', docId); // updates the existing document with a new version

    this.http.post(`${this.basePath}/documents`, formData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isEditMode.set(false);
        this.state.showToast('Changes Saved', 'A new version has been processed successfully.');
        // Select the new version
        this.selectedVersionId.set(null); // automatically falls back to current (latest)
        this.documentQuery.reload();
      },
      error: (err) => {
        console.error('Save content failed:', err);
        this.state.showToast('Save Failed', 'Failed to save changes. Please try again.');
        this.isSaving.set(false);
      },
    });
  }

  // Delete version controls
  deleteVersion(versionId: string, event: Event) {
    event.stopPropagation();
    const workspaceId = this.workspaceIdParam();
    const docId = this.documentIdParam();
    if (!workspaceId || !docId) return;

    if (this.versions().length <= 1) {
      this.state.showToast('Forbidden', 'A document must have at least one version.');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this version from storage?')) {
      return;
    }

    this.state.showToast('Deleting Version', 'Removing version snapshot...');
    this.documentsService
      .documentsControllerRemoveVersion({
        documentId: docId,
        id: versionId,
        workspaceId: workspaceId,
      })
      .subscribe({
        next: () => {
          this.state.showToast('Version Removed', 'The version snapshot has been deleted.');
          if (this.selectedVersionId() === versionId) {
            this.selectedVersionId.set(null);
          }
          this.documentQuery.reload();
        },
        error: (err) => {
          console.error('Delete version failed:', err);
          this.state.showToast('Delete Failed', 'Failed to delete selected version.');
        },
      });
  }

  // Render a safe, simple html representation of Markdown syntax
  protected renderMarkdown(md: string): string {
    if (!md) return '<p class="text-on-surface-variant/60 italic">No content available.</p>';

    let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Fenced Code Blocks
    html = html.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-surface-container-high/60 p-md rounded-lg overflow-x-auto font-mono text-xs border border-outline-variant/30 my-md"><code class="text-on-surface">$1</code></pre>',
    );

    // Inline Code
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="bg-surface-container-high/90 px-xs py-xxs rounded font-mono text-xs text-primary border border-outline-variant/30">$1</code>',
    );

    // Headers
    html = html.replace(
      /^### (.*$)/gim,
      '<h4 class="font-headline-sm text-md font-semibold text-on-surface mt-lg mb-sm">$1</h4>',
    );
    html = html.replace(
      /^## (.*$)/gim,
      '<h3 class="font-headline-md text-lg font-bold text-on-surface mt-xl mb-md">$1</h3>',
    );
    html = html.replace(
      /^# (.*$)/gim,
      '<h2 class="font-headline-lg text-xl font-extrabold text-on-surface mt-2xl mb-md">$1</h2>',
    );

    // Bold
    html = html.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="font-bold text-on-surface">$1</strong>',
    );

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

    // Bullet Lists
    html = html.replace(
      /^\s*-\s+(.*$)/gim,
      '<li class="ml-md list-disc text-on-surface-variant/90 pl-xs py-xxs">$1</li>',
    );
    html = html.replace(
      /^\s*\*\s+(.*$)/gim,
      '<li class="ml-md list-disc text-on-surface-variant/90 pl-xs py-xxs">$1</li>',
    );

    // Paragraph Split
    html = html
      .split('\n\n')
      .map((p) => {
        const trimmed = p.trim();
        if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<li')) {
          return p;
        }
        return `<p class="font-body-md text-body-md text-on-surface-variant/90 leading-relaxed mb-md">${p.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');

    return html;
  }
}
