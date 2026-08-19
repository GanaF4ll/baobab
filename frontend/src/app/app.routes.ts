import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { ConversationDetailComponent } from './features/conversations/screens/conversation-detail/conversation-detail.component';
import { DocumentDetailComponent } from './features/documents/screens/document-detail/document-detail.component';
import { DocumentsPageComponent } from './features/documents/screens/documents-page/documents-page.component';
import { TrashPageComponent } from './features/trash/screens/trash-page/trash-page.component';
import { WorkspacesPageComponent } from './features/workspaces/screens/workspaces-page/workspaces-page.component';

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
    path: 'trash',
    component: TrashPageComponent,
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
