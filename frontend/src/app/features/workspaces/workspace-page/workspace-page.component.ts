import { Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../../../core/layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../../core/layout/header/header.component';
import { WorkspaceCardComponent } from '../components/workspace-card/workspace-card.component';
import { CreateWorkspaceDialogComponent } from '../components/create-workspace-dialog/create-workspace-dialog.component';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { WorkspacesStateService } from '../services/workspaces-state.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { CreateWorkspaceDto } from '../../../../client/models';

@Component({
  selector: 'app-workspace-page',
  imports: [SidebarComponent, HeaderComponent, WorkspaceCardComponent],
  templateUrl: './workspace-page.component.html',
  styleUrls: [],
})
export class WorkspacePageComponent implements OnInit {
  private readonly hlmDialogService = inject(HlmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state = inject(WorkspacesStateService);
  protected readonly sidebarService = inject(SidebarService);

  protected readonly isWorkspaceDetailView = signal(false);

  protected readonly activeWorkspace = computed(() => {
    const id = this.state.activeWorkspaceId();
    if (!id) return null;
    return this.state.workspaces().find((w) => w.id === id) || null;
  });

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isWorkspaceDetailView.set(true);
        this.state.selectWorkspace(id, false);
      } else {
        this.isWorkspaceDetailView.set(false);
      }
    });
  }

  onWorkspaceSelect(id: string) {
    this.router.navigate(['/workspace', id]);
  }

  handleSidebarBottomClick() {
    if (this.isWorkspaceDetailView()) {
      this.state.showToast('Document Upload', 'Document upload placeholder triggered.');
    } else {
      this.openCreateWorkspaceDialog();
    }
  }

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
