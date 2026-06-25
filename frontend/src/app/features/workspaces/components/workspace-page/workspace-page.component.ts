import { Component, inject } from '@angular/core';
import { SidebarComponent } from '../../../../core/layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../../../core/layout/header/header.component';
import { WorkspaceCardComponent } from '../workspace-card/workspace-card.component';
import { CreateWorkspaceDialogComponent } from '../create-workspace-dialog/create-workspace-dialog.component';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { WorkspacesStateService } from '../../services/workspaces-state.service';
import { CreateWorkspaceDto } from '../../../../../client/models';

@Component({
  selector: 'app-workspace-page',
  imports: [SidebarComponent, HeaderComponent, WorkspaceCardComponent],
  templateUrl: './workspace-page.component.html',
  styleUrls: [],
})
export class WorkspacePageComponent {
  private readonly hlmDialogService = inject(HlmDialogService);
  protected readonly state = inject(WorkspacesStateService);

  openCreateWorkspaceDialog() {
    const dialogRef = this.hlmDialogService.open(CreateWorkspaceDialogComponent, {
      contentClass:
        'max-w-md p-6 bg-surface-container-low border border-outline-variant rounded-lg',
    });

    dialogRef.closed$.subscribe((result) => {
      const data = result as CreateWorkspaceDto | undefined;
      if (data?.name) {
        this.state.createWorkspace(data.name, data.description || '');
      }
    });
  }
}
