import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { UsersService } from 'src/users/users.service';
import { IS_PUBLIC_KEY } from 'src/auth/decorators/public.decorator';
import { DRIZZLE } from 'src/drizzle/drizzle.module';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = 'valid.jwt.token';
const JWT_SECRET = 'test-secret';

const mockUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'DUPONT',
};

/** Build a minimal ExecutionContext mock */
function buildContext(options: { authHeader?: string }): ExecutionContext {
  const handler = jest.fn();
  const klass = jest.fn();

  return {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: options.authHeader },
      }),
    }),
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let jwtService: jest.Mocked<JwtService>;
  let usersService: jest.Mocked<UsersService>;
  let _configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(JWT_SECRET) },
        },
        {
          provide: UsersService,
          useValue: { findOneById: jest.fn() },
        },
        { provide: DRIZZLE, useValue: {} },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    reflector = module.get(Reflector);
    jwtService = module.get(JwtService);
    usersService = module.get(UsersService);
    _configService = module.get(ConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Public routes
  // -------------------------------------------------------------------------

  describe('when route is marked @Public()', () => {
    it('returns true without verifying the token', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(buildContext({}));

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Missing / malformed Authorization header
  // -------------------------------------------------------------------------

  describe('when no Authorization header is present', () => {
    it('throws UnauthorizedException', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(buildContext({}))).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when Authorization header is not a Bearer token', () => {
    it('throws UnauthorizedException', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      await expect(
        guard.canActivate(buildContext({ authHeader: 'Basic somebase64' })),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // Invalid / expired JWT
  // -------------------------------------------------------------------------

  describe('when JWT verification fails', () => {
    it('throws UnauthorizedException', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        guard.canActivate(buildContext({ authHeader: `Bearer ${VALID_TOKEN}` })),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // Valid token
  // -------------------------------------------------------------------------

  describe('when JWT is valid', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue({ id: mockUser.id });
      usersService.findOneById.mockResolvedValue(mockUser as any);
    });

    it('returns true', async () => {
      const result = await guard.canActivate(buildContext({ authHeader: `Bearer ${VALID_TOKEN}` }));

      expect(result).toBe(true);
    });

    it('attaches the resolved user to request["user"]', async () => {
      const request: Record<string, unknown> = {
        headers: { authorization: `Bearer ${VALID_TOKEN}` },
      };
      const ctx = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      await guard.canActivate(ctx);

      expect(request['user']).toEqual(mockUser);
    });

    it('verifies the token against JWT_SECRET from ConfigService', async () => {
      await guard.canActivate(buildContext({ authHeader: `Bearer ${VALID_TOKEN}` }));

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        VALID_TOKEN,
        expect.objectContaining({ secret: JWT_SECRET }),
      );
    });

    it('looks up the user by the id claim of the payload', async () => {
      await guard.canActivate(buildContext({ authHeader: `Bearer ${VALID_TOKEN}` }));

      expect(usersService.findOneById).toHaveBeenCalledWith(mockUser.id);
    });

    it('reads IS_PUBLIC_KEY via Reflector', async () => {
      await guard.canActivate(buildContext({ authHeader: `Bearer ${VALID_TOKEN}` }));

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
    });
  });
});
