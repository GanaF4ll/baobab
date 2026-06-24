import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthService as ApiAuthService } from '../../../client';

describe('AuthService', () => {
  let service: AuthService;
  let apiAuthServiceMock: {
    authControllerLogin: any;
    authControllerRegister: any;
    authControllerRefresh: any;
  };

  beforeEach(() => {
    // Reset localStorage before each test
    try {
      localStorage.clear();
    } catch {}

    apiAuthServiceMock = {
      authControllerLogin: () => of({}),
      authControllerRegister: () => of({}),
      authControllerRefresh: () => of({}),
    };

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: ApiAuthService, useValue: apiAuthServiceMock }],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    try {
      localStorage.clear();
    } catch {}
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return initial values from localStorage if present', () => {
    expect(service.accessToken()).toBeNull();
    expect(service.refreshToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should login and set session', () => {
    const payload = {
      id: '123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    // Create base64Url encoding
    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const token = `header.${encodedPayload}.signature`;

    const mockResponse = {
      data: {
        accessToken: token,
        refreshToken: 'refresh-token-value',
      },
    };

    // Override the mock method to return the expected value
    apiAuthServiceMock.authControllerLogin = (dto: any) => {
      expect(dto.email).toBe('test@example.com');
      return of(mockResponse);
    };

    service.login('test@example.com').subscribe();

    expect(service.accessToken()).toBe(token);
    expect(service.refreshToken()).toBe('refresh-token-value');
    expect(service.currentUser()).toEqual(expect.objectContaining({ email: 'test@example.com' }));
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should logout and clear session', () => {
    const payload = {
      id: '123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const token = `header.${encodedPayload}.signature`;

    const mockResponse = {
      data: {
        accessToken: token,
        refreshToken: 'refresh-token-value',
      },
    };

    apiAuthServiceMock.authControllerLogin = () => of(mockResponse);
    service.login('test@example.com').subscribe();

    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.accessToken()).toBeNull();
    expect(service.refreshToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
