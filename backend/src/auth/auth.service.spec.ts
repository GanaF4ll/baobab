import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { TokenType } from 'src/shared/constants';
import * as argon2 from 'argon2';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'john.doe@example.com',
  passwordHash: 'hashed-password',
  firstName: 'John',
  lastName: 'DOE',
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

const mockRefreshTokenRow = {
  id: 'rt-uuid-1',
  userId: mockUser.id,
  token: mockTokens.refreshToken,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // future
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-signed-token'),
  verifyAsync: jest.fn(),
};

const mockUsersService = {
  findOneByEmail: jest.fn(),
  findOneById: jest.fn(),
  create: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('debug'),
};

const mockInsert = jest.fn().mockReturnValue({
  values: jest.fn().mockResolvedValue(undefined),
});

const mockDelete = jest.fn().mockReturnValue({
  where: jest.fn().mockResolvedValue(undefined),
});

const mockFindFirst = jest.fn();

const mockDb = {
  insert: mockInsert,
  delete: mockDelete,
  query: {
    refreshTokens: {
      findFirst: mockFindFirst,
    },
  },
};

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const createUserDto = {
      email: 'John.Doe@Example.com',
      password: 'StrongPass1!',
      firstName: 'john',
      lastName: 'doe',
    };

    it('should register a new user and return tokens', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await service.register(createUserDto);

      expect(mockUsersService.findOneByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'DOE',
        }),
      );
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    const loginDto = {
      email: 'John.Doe@Example.com',
      password: 'StrongPass1!',
    };

    beforeEach(() => {
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
    });

    it('should login successfully and return tokens', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockFindFirst.mockResolvedValue(null); // no existing refresh token
      mockJwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await service.login(loginDto);

      expect(mockUsersService.findOneByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should delete existing refresh token before creating a new one', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockFindFirst.mockResolvedValue(mockRefreshTokenRow);

      await service.login(loginDto);

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh tokens successfully', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: mockUser.id, type: TokenType.REFRESH });
      mockUsersService.findOneById.mockResolvedValue(mockUser);
      mockFindFirst.mockResolvedValue(mockRefreshTokenRow);
      mockJwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await service.refresh(refreshToken);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(refreshToken);
      expect(mockUsersService.findOneById).toHaveBeenCalledWith(mockUser.id);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should throw UnauthorizedException if token type is not REFRESH', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: mockUser.id, type: TokenType.ACCESS });

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: mockUser.id, type: TokenType.REFRESH });
      mockUsersService.findOneById.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token not found in DB', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: mockUser.id, type: TokenType.REFRESH });
      mockUsersService.findOneById.mockResolvedValue(mockUser);
      mockFindFirst.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: mockUser.id, type: TokenType.REFRESH });
      mockUsersService.findOneById.mockResolvedValue(mockUser);
      mockFindFirst.mockResolvedValue({
        ...mockRefreshTokenRow,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if verifyAsync throws (invalid/malformed token)', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
