import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_TOKEN = 'signed.jwt.token';

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
            register: jest.fn().mockResolvedValue(FAKE_TOKEN),
            login: jest.fn().mockResolvedValue(FAKE_TOKEN),
          },
        },
      ],
    }).compile();

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

    it('wraps the access token in a { data } envelope', async () => {
      const result = await controller.register(registerDto as any);

      expect(result).toEqual({ data: FAKE_TOKEN });
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

    it('wraps the access token in a { data } envelope', async () => {
      const result = await controller.login(loginDto as any);

      expect(result).toEqual({ data: FAKE_TOKEN });
    });

    it('propagates errors thrown by authService.login', async () => {
      const error = new Error('login failed');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto as any)).rejects.toThrow(error);
    });
  });
});
