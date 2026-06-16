import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_TOKENS = {
  accessToken: 'signed.access.token',
  refreshToken: 'signed.refresh.token',
};

const registerDto = {
  email: 'alice@example.com',
  password: 'secret',
  firstName: 'Alice',
  lastName: 'Dupont',
};

const loginDto = {
  email: 'alice@example.com',
  password: 'secret',
};

const refreshDto = {
  refreshToken: 'valid.refresh.jwt',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue(FAKE_TOKENS),
            login: jest.fn().mockResolvedValue(FAKE_TOKENS),
            refresh: jest.fn().mockResolvedValue(FAKE_TOKENS),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe('register', () => {
    it('delegates to authService.register with the provided DTO', async () => {
      await controller.register(registerDto as any);

      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('wraps the tokens in a { data } envelope', async () => {
      const result = await controller.register(registerDto as any);

      expect(result).toEqual({ data: FAKE_TOKENS });
    });

    it('propagates errors thrown by authService.register', async () => {
      const error = new Error('registration failed');
      authService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto as any)).rejects.toThrow(error);
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe('login', () => {
    it('delegates to authService.login with the provided DTO', async () => {
      await controller.login(loginDto as any);

      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('wraps the tokens in a { data } envelope', async () => {
      const result = await controller.login(loginDto as any);

      expect(result).toEqual({ data: FAKE_TOKENS });
    });

    it('propagates errors thrown by authService.login', async () => {
      const error = new Error('login failed');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto as any)).rejects.toThrow(error);
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------

  describe('refresh', () => {
    it('delegates to authService.refresh with the refreshToken from the DTO', async () => {
      await controller.refresh(refreshDto as any);

      expect(authService.refresh).toHaveBeenCalledTimes(1);
      expect(authService.refresh).toHaveBeenCalledWith(refreshDto.refreshToken);
    });

    it('wraps the new tokens in a { data } envelope', async () => {
      const result = await controller.refresh(refreshDto as any);

      expect(result).toEqual({ data: FAKE_TOKENS });
    });

    it('propagates errors thrown by authService.refresh', async () => {
      const error = new Error('token refresh failed');
      authService.refresh.mockRejectedValue(error);

      await expect(controller.refresh(refreshDto as any)).rejects.toThrow(error);
    });
  });
});
