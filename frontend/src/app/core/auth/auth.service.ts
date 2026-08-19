import { computed, Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AuthService as ApiAuthService,
  CreateUserDto,
  RegisterAndLoginResponseDto,
} from '../../../client';

export interface UserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  exp?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiAuthService = inject(ApiAuthService);

  private readonly _accessToken = signal<string | null>(this.getStoredToken('access_token'));
  private readonly _refreshToken = signal<string | null>(this.getStoredToken('refresh_token'));
  private readonly _currentUser = signal<UserPayload | null>(
    this.decodeToken(this.getStoredToken('access_token')),
  );

  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken() && !this.isTokenExpired());

  login(email: string, password: string): Observable<any> {
    return this.apiAuthService.authControllerLogin({ email, password }).pipe(
      tap((response) => {
        const data = response?.data;
        if (data?.accessToken && data?.refreshToken) {
          this.setSession(data.accessToken, data.refreshToken);
        }
      }),
    );
  }

  register(createUserDto: CreateUserDto): Observable<RegisterAndLoginResponseDto> {
    return this.apiAuthService.authControllerRegister(createUserDto).pipe(
      tap((response) => {
        const data = response?.data;
        if (data?.accessToken && data?.refreshToken) {
          this.setSession(data.accessToken, data.refreshToken);
        }
      }),
    );
  }

  refresh(): Observable<RegisterAndLoginResponseDto> {
    const refreshToken = this._refreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    return this.apiAuthService.authControllerRefresh({ refreshToken }).pipe(
      tap((response) => {
        const data = response?.data;
        if (data?.accessToken && data?.refreshToken) {
          this.setSession(data.accessToken, data.refreshToken);
        } else {
          this.logout();
        }
      }),
    );
  }

  logout(): void {
    this.clearSession();
  }

  private setSession(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    } catch (e) {
      console.warn('LocalStorage not accessible:', e);
    }
    this._accessToken.set(accessToken);
    this._refreshToken.set(refreshToken);
    this._currentUser.set(this.decodeToken(accessToken));
  }

  private clearSession(): void {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } catch (e) {
      console.warn('LocalStorage not accessible:', e);
    }
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._currentUser.set(null);
  }

  private getStoredToken(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private decodeToken(token: string | null): UserPayload | null {
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private isTokenExpired(): boolean {
    const user = this._currentUser();
    if (!user?.exp) return true;
    return Date.now() >= user.exp * 1000;
  }
}
