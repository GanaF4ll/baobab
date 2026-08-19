import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DocumentEntity } from '../../../../../client/models';
import { DocumentsResource } from '../../../../../client/resources';
import { BASE_PATH_DEFAULT } from '../../../../../client/tokens';
import { HeaderComponent } from '../../../../core/layout/header/header.component';
import { SidebarComponent } from '../../../../core/layout/sidebar/sidebar.component';
import { SidebarService } from '../../../../core/services/sidebar.service';
import { WorkspacesStateService } from '../../../workspaces/services/workspaces-state.service';
import { DocumentCardComponent } from '../../components/document-card/document-card.component';
import { DocumentDropzoneComponent } from '../../components/document-dropzone/document-dropzone.component';
import { DocumentFilterComponent } from '../../components/document-filter/document-filter.component';

@Component({
  selector: 'app-documents-page',
  imports: [
    SidebarComponent,
    HeaderComponent,
    DocumentFilterComponent,
    DocumentCardComponent,
    DocumentDropzoneComponent,
  ],
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.css',
})
export class DocumentsPageComponent implements OnInit {
  protected readonly state = inject(WorkspacesStateService);
  private readonly documentResource = inject(DocumentsResource);
  protected readonly sidebarService = inject(SidebarService);
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH_DEFAULT);

  handleSidebarBottomClick() {
    this.state.showToast('Document Upload', 'Document upload placeholder triggered.');
  }

  private readonly activeWorkspaceId = computed(() => this.state.activeWorkspaceId() || '');

  protected readonly selectedMimeType = signal<DocumentEntity['mimeType'] | undefined>(undefined);

  protected readonly documentsQuery = this.documentResource.documentsControllerFindAllByWorkspace(
    this.activeWorkspaceId,
    undefined,
    undefined,
    undefined,
    this.selectedMimeType,
    {
      defaultValue: { data: { items: [], nextCursor: null, totalCount: 0 } },
    },
  );

  protected readonly documents = computed(() => this.documentsQuery.value()?.data?.items || []);

  onMimeTypeSelected(type: string | null) {
    if (type === 'application/pdf' || type === 'text/markdown') {
      this.selectedMimeType.set(type);
    } else {
      this.selectedMimeType.set(undefined);
    }
  }

  uploadFile(file: File) {
    const workspaceId = this.activeWorkspaceId();
    if (!workspaceId) return;

    this.state.showToast('Uploading Document', `Uploading '${file.name}' to secure silo...`);

    const formData = new FormData();
    formData.append('workspaceId', workspaceId);
    formData.append('file', file);

    this.http.post(`${this.basePath}/documents`, formData).subscribe({
      next: () => {
        this.state.showToast(
          'Upload Successful',
          `'${file.name}' has been processed successfully.`,
        );
        this.documentsQuery.reload();
      },
      error: (err) => {
        console.error('Upload failed:', err);
        this.state.showToast(
          'Upload Failed',
          'Failed to upload document. Please check the console.',
        );
      },
    });
  }

  ngOnInit(): void {}
}
