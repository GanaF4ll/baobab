import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'DUPONT',
  passwordHash: 'hashed-password',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUserPublic = {
  id: mockUser.id,
  email: mockUser.email,
  firstName: mockUser.firstName,
  lastName: mockUser.lastName,
  createdAt: mockUser.createdAt,
  updatedAt: mockUser.updatedAt,
};

// ---------------------------------------------------------------------------
// DB mock factory (re-created before each test so each test can override it)
// ---------------------------------------------------------------------------

const buildDbMock = () => ({
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([mockUserPublic]),
    }),
  }),
  query: {
    users: {
      findFirst: jest.fn().mockResolvedValue(mockUser),
    },
  },
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('UsersService', () => {
  let service: UsersService;
  let db: ReturnType<typeof buildDbMock>;

  beforeEach(async () => {
    db = buildDbMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: DRIZZLE, useValue: db }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    const dto = {
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Dupont',
      password: 'secret',
    };

    it('inserts the user and returns the public fields', async () => {
      const result = await service.create(dto);

      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUserPublic);
    });

    it("passes the raw password as passwordHash to the DB (hashing is the caller's responsibility)", async () => {
      await service.create(dto);

      const valuesSpy = db.insert().values as jest.Mock;
      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: dto.password }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('returns the placeholder string', () => {
      expect(service.findAll()).toBe('This action returns all users');
    });
  });

  // -------------------------------------------------------------------------
  // findOneById
  // -------------------------------------------------------------------------

  describe('findOneById', () => {
    it('returns the user when found', async () => {
      const result = await service.findOneById(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundException when no user matches the id', async () => {
      db.query.users.findFirst.mockResolvedValue(undefined);

      await expect(service.findOneById('unknown-id')).rejects.toThrow(
        new NotFoundException('User with ID "unknown-id" not found'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findOneByEmail
  // -------------------------------------------------------------------------

  describe('findOneByEmail', () => {
    it('returns the user when found', async () => {
      const result = await service.findOneByEmail(mockUser.email);
      expect(result).toEqual(mockUser);
    });

    it('returns undefined when no user matches the email', async () => {
      db.query.users.findFirst.mockResolvedValue(undefined);

      const result = await service.findOneByEmail('notfound@example.com');
      expect(result).toBeUndefined();
    });
  });
});
