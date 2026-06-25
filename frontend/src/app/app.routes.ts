import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { WorkspacePageComponent } from './features/workspaces/components/workspace-page/workspace-page.component';
import { authGuard, publicGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
  },
  {
    path: '',
    component: WorkspacePageComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
