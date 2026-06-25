import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { SidebarComponent } from '../../../core/layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../../core/layout/header/header.component';
import { WorkspacesResource } from '../../../../client/resources/workspaces.resource';
import { WorkspacesStateService } from '../services/workspaces-state.service';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-workspace-detail',
  imports: [SidebarComponent, HeaderComponent, RouterLink],
  templateUrl: './workspace-detail.component.html',
  styleUrls: [],
})
export class WorkspaceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly workspacesResource = inject(WorkspacesResource);
  protected readonly state = inject(WorkspacesStateService);
  protected readonly sidebarService = inject(SidebarService);

  // Extract the id parameter as a signal using route.paramMap
  private readonly idParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') || '')),
    { initialValue: '' }
  );

  // Call the workspacesControllerFindOne endpoint using the id signal
  protected readonly workspaceQuery = this.workspacesResource.workspacesControllerFindOne(
    this.idParam,
    {
      defaultValue: undefined,
    }
  );

  protected readonly workspace = computed(() => this.workspaceQuery.value()?.data);
  protected readonly isLoading = computed(() => this.workspaceQuery.isLoading());
  protected readonly error = computed(() => this.workspaceQuery.error());

  ngOnInit() {
    // Sync active workspace ID in global state service when parameter changes
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.state.selectWorkspace(id, false);
      }
    });
  }

  handleSidebarBottomClick() {
    this.state.showToast('Document Upload', 'Document upload placeholder triggered.');
  }
}
