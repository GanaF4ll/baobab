import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DocumentsResource } from '../../../../../client/resources';
import { HeaderComponent } from '../../../../core/layout/header/header.component';
import { SidebarComponent } from '../../../../core/layout/sidebar/sidebar.component';
import { SidebarService } from '../../../../core/services/sidebar.service';
import { WorkspacesStateService } from '../../../workspaces/services/workspaces-state.service';
import { DocumentFilterComponent } from '../../components/document-filter/document-filter.component';
import { DocumentCardComponent } from '../../components/document-card/document-card.component';
import { DocumentEntity } from '../../../../../client/models';

@Component({
  selector: 'app-documents-page',
  imports: [SidebarComponent, HeaderComponent, DocumentFilterComponent, DocumentCardComponent],
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.css',
})
export class DocumentsPageComponent implements OnInit {
  protected readonly state = inject(WorkspacesStateService);
  private readonly documentResource = inject(DocumentsResource);

  protected readonly sidebarService = inject(SidebarService);

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

  ngOnInit(): void {}
}
