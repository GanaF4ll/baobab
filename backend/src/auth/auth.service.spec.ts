import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { TokenType } from 'src/shared/constants';
import * as argon2 from 'argon2';

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

const FAKE_TOKEN = 'signed.jwt.token';

const mockUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'DUPONT',
  passwordHash: 'hashed-secret',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue(FAKE_TOKEN),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test'),
          },
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

      // Access private getter via bracket notation
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
    });

    it('throws ConflictException when email already exists', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser as any);

      // The service throws with the raw (non-lowercased) email it received
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

    it('signs a JWT with the ACCESS token type and returns it', async () => {
      const token = await service.register(dto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { id: mockUser.id, type: TokenType.ACCESS },
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
      expect(token).toBe(FAKE_TOKEN);
    });

    it('checks for existing user with the raw email (normalization happens after the check)', async () => {
      await service.register(dto);

      // findOneByEmail is called before toLowerCase() is applied
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(dto.email);
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

    it('signs a JWT with the ACCESS token type and returns it', async () => {
      const token = await service.login(dto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { id: mockUser.id, type: TokenType.ACCESS },
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
      expect(token).toBe(FAKE_TOKEN);
    });
  });
});
