import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { WorkspaceDetailComponent } from './features/workspaces/screens/workspace-detail/workspace-detail.component';
import { authGuard, publicGuard } from './core/auth/auth.guard';
import { WorkspacesPageComponent } from './features/workspaces/screens/workspaces-page/workspaces-page.component';
import { ConversationDetailComponent } from './features/conversations/screens/conversation-detail/conversation-detail.component';
import { DocumentsPageComponent } from './features/documents/screens/documents-page/documents-page.component';
import { DocumentDetailComponent } from './features/documents/screens/document-detail/document-detail.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
  },
  {
    path: '',
    component: WorkspacesPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'workspace/:id',
    component: WorkspaceDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'workspace/:id/conversation/:conversationId',
    component: ConversationDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'workspace/:id/documents',
    component: DocumentsPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'workspace/:id/documents/:documentId',
    component: DocumentDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
