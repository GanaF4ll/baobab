import { Component, computed, EventEmitter, inject, input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { SidebarService } from '../../services/sidebar.service';
import { WorkspacesStateService } from '../../../features/workspaces/services/workspaces-state.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, HlmButton],
  templateUrl: './sidebar.component.html',
  styleUrls: []
})
export class SidebarComponent {
  protected readonly sidebarService = inject(SidebarService);
  protected readonly state = inject(WorkspacesStateService);

  readonly inWorkspace = input<boolean>(false);

  @Output() uploadClick = new EventEmitter<void>();

  protected readonly activeWorkspace = computed(() => {
    const id = this.state.activeWorkspaceId();
    if (!id) return null;
    return this.state.workspaces().find((w) => w.id === id) || null;
  });

  onUpload() {
    this.uploadClick.emit();
  }

  get isOpen() {
    return this.sidebarService.isOpen;
  }
}
