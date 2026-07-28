import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuthService } from 'src/auth/auth.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { TokenType } from 'src/shared/constants';
import { UsersService } from 'src/users/users.service';

// ---------------------------------------------------------------------------
// Mock argon2
// ---------------------------------------------------------------------------

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_ACCESS_TOKEN = 'signed.access.token';
const FAKE_REFRESH_TOKEN = 'signed.refresh.token';

const mockUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'DUPONT',
  passwordHash: 'hashed-secret',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRefreshTokenRow = {
  id: 'rt-uuid-1',
  userId: mockUser.id,
  token: FAKE_REFRESH_TOKEN,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // valid: future date
};

// ---------------------------------------------------------------------------
// Drizzle mock
// ---------------------------------------------------------------------------

const mockFindFirst = jest.fn();

const mockDb = {
  insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) }),
  delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
  query: {
    refreshTokens: { findFirst: mockFindFirst },
  },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn(),
            findOneById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test'),
          },
        },
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TOKEN_EXPIRATION_TIME
  // -------------------------------------------------------------------------

  describe('TOKEN_EXPIRATION_TIME (private getter)', () => {
    it('returns "1d" in non-production environments', () => {
      configService.getOrThrow.mockReturnValue('development');

      const expiration = (service as any).TOKEN_EXPIRATION_TIME;
      expect(expiration).toBe('1d');
    });

    it('returns "15m" in production environment', () => {
      configService.getOrThrow.mockReturnValue('production');

      const expiration = (service as any).TOKEN_EXPIRATION_TIME;
      expect(expiration).toBe('15m');
    });
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe('register', () => {
    const dto = {
      email: 'Alice@Example.COM',
      password: 'secret',
      firstName: 'alice',
      lastName: 'dupont',
    };

    beforeEach(() => {
      usersService.findOneByEmail.mockResolvedValue(undefined);
      usersService.create.mockResolvedValue({ id: mockUser.id } as any);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-secret');
      jwtService.sign
        .mockReturnValueOnce(FAKE_ACCESS_TOKEN)
        .mockReturnValueOnce(FAKE_REFRESH_TOKEN);
    });

    it('throws ConflictException when email already exists', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser as any);

      await expect(service.register(dto)).rejects.toThrow(
        new ConflictException(`User with email "${dto.email}" already exists`),
      );
    });

    it('hashes the password before creating the user', async () => {
      await service.register(dto);

      expect(argon2.hash).toHaveBeenCalledWith(dto.password);
    });

    it('normalises email, firstName and lastName before creating the user', async () => {
      await service.register(dto);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'DUPONT',
        }),
      );
    });

    it('signs a JWT with the ACCESS token type and returns access + refresh tokens', async () => {
      const result = await service.register(dto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { id: mockUser.id, type: TokenType.ACCESS },
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
      expect(result).toEqual({
        accessToken: FAKE_ACCESS_TOKEN,
        refreshToken: FAKE_REFRESH_TOKEN,
      });
    });

    it('checks for existing user with the raw email (normalization happens after the check)', async () => {
      await service.register(dto);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(dto.email);
    });

    it('stores the refresh token in the database', async () => {
      await service.register(dto);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe('login', () => {
    const dto = {
      email: 'Alice@Example.COM',
      password: 'secret',
    };

    beforeEach(() => {
      usersService.findOneByEmail.mockResolvedValue(mockUser as any);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockFindFirst.mockResolvedValue(null);
      jwtService.sign
        .mockReturnValueOnce(FAKE_ACCESS_TOKEN)
        .mockReturnValueOnce(FAKE_REFRESH_TOKEN);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      usersService.findOneByEmail.mockResolvedValue(undefined);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('looks up user by lowercased email', async () => {
      await service.login(dto);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(dto.email.toLowerCase());
    });

    it('throws UnauthorizedException when password is invalid', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('verifies password against the stored hash', async () => {
      await service.login(dto);

      expect(argon2.verify).toHaveBeenCalledWith(mockUser.passwordHash, dto.password);
    });

    it('signs a JWT with the ACCESS token type and returns access + refresh tokens', async () => {
      const result = await service.login(dto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { id: mockUser.id, type: TokenType.ACCESS },
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
      expect(result).toEqual({
        accessToken: FAKE_ACCESS_TOKEN,
        refreshToken: FAKE_REFRESH_TOKEN,
      });
    });

    it('deletes existing refresh token before creating a new one', async () => {
      mockFindFirst.mockResolvedValue(mockRefreshTokenRow);

      await service.login(dto);

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('stores the new refresh token in the database', async () => {
      await service.login(dto);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------

  describe('refresh', () => {
    const INCOMING_TOKEN = 'incoming.refresh.token';

    beforeEach(() => {
      jwtService.verifyAsync.mockResolvedValue({ id: mockUser.id, type: TokenType.REFRESH });
      usersService.findOneById.mockResolvedValue(mockUser as any);
      mockFindFirst.mockResolvedValue(mockRefreshTokenRow);
      jwtService.sign
        .mockReturnValueOnce(FAKE_ACCESS_TOKEN)
        .mockReturnValueOnce(FAKE_REFRESH_TOKEN);
    });

    it('returns new access and refresh tokens on success', async () => {
      const result = await service.refresh(INCOMING_TOKEN);

      expect(result).toEqual({
        accessToken: FAKE_ACCESS_TOKEN,
        refreshToken: FAKE_REFRESH_TOKEN,
      });
    });

    it('verifies the incoming token via jwtService.verifyAsync', async () => {
      await service.refresh(INCOMING_TOKEN);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(INCOMING_TOKEN);
    });

    it('throws UnauthorizedException when token type is not REFRESH', async () => {
      jwtService.verifyAsync.mockResolvedValue({ id: mockUser.id, type: TokenType.ACCESS });

      await expect(service.refresh(INCOMING_TOKEN)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      usersService.findOneById.mockResolvedValue(null as any);

      await expect(service.refresh(INCOMING_TOKEN)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token is not found in DB', async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(service.refresh(INCOMING_TOKEN)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token is expired', async () => {
      mockFindFirst.mockResolvedValue({
        ...mockRefreshTokenRow,
        expiresAt: new Date(Date.now() - 1000), // past date
      });

      await expect(service.refresh(INCOMING_TOKEN)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when verifyAsync throws (malformed token)', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

      await expect(service.refresh(INCOMING_TOKEN)).rejects.toThrow(UnauthorizedException);
    });

    it('stores the new refresh token in the database', async () => {
      await service.refresh(INCOMING_TOKEN);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
