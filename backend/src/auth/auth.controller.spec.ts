import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/input/login.dto';
import { RefreshTokenDto } from './dto/input/refresh-token.dto';
import { AuthGuard } from './guards/auth.guard';
import { CanActivate, ExecutionContext } from '@nestjs/common';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

const mockAuthService = {
  register: jest.fn().mockResolvedValue(mockTokens),
  login: jest.fn().mockResolvedValue(mockTokens),
  refresh: jest.fn().mockResolvedValue(mockTokens),
};

/** Bypass AuthGuard in unit tests — we test guards separately */
class MockAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto: CreateUserDto = {
      email: 'john.doe@example.com',
      password: 'StrongPass1!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should call authService.register and wrap result in { data }', async () => {
      mockAuthService.register.mockResolvedValue(mockTokens);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockTokens });
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    const dto: LoginDto = {
      email: 'john.doe@example.com',
      password: 'StrongPass1!',
    };

    it('should call authService.login and wrap result in { data }', async () => {
      mockAuthService.login.mockResolvedValue(mockTokens);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockTokens });
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    const dto: RefreshTokenDto = {
      refreshToken: 'some-valid-refresh-jwt',
    };

    it('should call authService.refresh with the token and wrap result in { data }', async () => {
      mockAuthService.refresh.mockResolvedValue(mockTokens);

      const result = await controller.refresh(dto);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(dto.refreshToken);
      expect(result).toEqual({ data: mockTokens });
    });
  });
});
