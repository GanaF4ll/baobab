import { Component, computed, inject, OnInit } from '@angular/core';
import { SidebarComponent } from '../../../../core/layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../../../core/layout/header/header.component';
import { RouterLink } from '@angular/router';
import { WorkspacesStateService } from '../../../workspaces/services/workspaces-state.service';
import { DocumentsResource } from '../../../../../client/resources';

@Component({
  selector: 'app-documents-page',
  imports: [SidebarComponent, HeaderComponent, RouterLink],
  templateUrl: './documents-page.component.html',
  styleUrl: './documents-page.component.css',
})
export class DocumentsPageComponent implements OnInit {
  protected readonly state = inject(WorkspacesStateService);
  private readonly documentResource = inject(DocumentsResource);

  handleSidebarBottomClick() {
    this.state.showToast('Document Upload', 'Document upload placeholder triggered.');
  }

  private readonly activeWorkspaceId = computed(() => this.state.activeWorkspaceId() || '');

  protected readonly documentsQuery = this.documentResource.documentsControllerFindAllByWorkspace(
    this.activeWorkspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      defaultValue: { data: { items: [], nextCursor: null, totalCount: 0 } },
    },
  );

  protected readonly documents = computed(() => this.documentsQuery.value()?.data?.items || []);

  ngOnInit(): void {}
}
