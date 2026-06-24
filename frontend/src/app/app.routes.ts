import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { WorkspacesDashboardComponent } from './features/workspaces/workspaces-dashboard/workspaces-dashboard.component';
import { authGuard, publicGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
  },
  {
    path: '',
    component: WorkspacesDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
