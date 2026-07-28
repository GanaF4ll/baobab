import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { WorkspacesStateService } from '../../features/workspaces/services/workspaces-state.service';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const workspacesState = inject(WorkspacesStateService);

  const token = authService.accessToken();
  const activeWorkspaceId = workspacesState.activeWorkspaceId();

  let authReq = req;

  // Replace {workspaceId} in URL if present
  if (activeWorkspaceId && req.url.includes('{workspaceId}')) {
    authReq = authReq.clone({
      url: req.url.replace('{workspaceId}', activeWorkspaceId),
    });
  }

  if (token) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      // If we get a 401 Unauthorized, and we're not already trying to login or refresh the token, attempt to refresh.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login')
      ) {
        return authService.refresh().pipe(
          switchMap((response) => {
            const newToken = response?.data?.accessToken;
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // If the refresh itself fails, log out (clearing state) and propagate error.
            authService.logout();
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
