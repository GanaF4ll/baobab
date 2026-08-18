import { Component, computed, EventEmitter, inject, input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { HlmInput } from '@spartan-ng/helm/input';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspacesStateService } from '../../../features/workspaces/services/workspaces-state.service';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-header',
  imports: [HlmInput],
  templateUrl: './header.component.html',
  styleUrls: [],
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sidebarService = inject(SidebarService);
  protected readonly state = inject(WorkspacesStateService);

  protected readonly currentUser = this.authService.currentUser;

  readonly inWorkspace = input<boolean>(false);

  protected readonly activeWorkspace = computed(() => {
    const id = this.state.activeWorkspaceId();
    if (!id) return null;
    return this.state.workspaces().find((w) => w.id === id) || null;
  });

  @Output() searchChange = new EventEmitter<string>();

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
