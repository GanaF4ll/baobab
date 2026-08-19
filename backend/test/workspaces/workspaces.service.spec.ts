import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { OrderFilter } from 'src/shared/constants';
import { WorkspacesService } from 'src/workspaces/workspaces.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockWorkspace = {
  id: 'ws-uuid-1',
  name: 'Project Baobab',
  description: 'A test workspace',
  ownerId: 'owner-uuid-1',
  createdAt: new Date('2026-06-19T12:00:00Z'),
  updatedAt: new Date('2026-06-19T12:00:00Z'),
  deletedAt: null as Date | null,
  documentCount: 0,
  icon: null as string | null,
};

// ---------------------------------------------------------------------------
// DB mock factory
// ---------------------------------------------------------------------------

const buildDbMock = () => {
  const insertReturningMock = jest.fn().mockResolvedValue([mockWorkspace]);
  const insertValuesMock = jest.fn().mockReturnValue({ returning: insertReturningMock });
  const insertMock = jest.fn().mockReturnValue({ values: insertValuesMock });

  const countWhereMock = jest.fn().mockResolvedValue([{ countValue: 1 }]);
  const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });

  const selectMock = jest.fn().mockImplementation((fields) => {
    const chain = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockImplementation((...args) => {
        const promise = countWhereMock(...args);
        const thenable = {
          // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for query builder
          then: (onFulfilled: any, onRejected: any) => {
            return Promise.resolve(promise)
              .then((val) => {
                if (Array.isArray(val) && val.length === 1 && val[0] && 'countValue' in val[0]) {
                  if (fields && 'count' in fields && !('workspaceId' in fields)) {
                    return [{ count: 0 }];
                  }
                  if (fields && 'workspaceId' in fields) {
                    return [];
                  }
                }
                return val;
              })
              .then(onFulfilled, onRejected);
          },
          groupBy: jest.fn().mockImplementation(() => thenable),
        };
        return thenable;
      }),
    };
    return chain;
  });

  const updateReturningMock = jest.fn().mockResolvedValue([mockWorkspace]);
  const updateWhereMock = jest.fn().mockReturnValue({ returning: updateReturningMock });
  const updateSetMock = jest.fn().mockReturnValue({ where: updateWhereMock });
  const updateMock = jest.fn().mockReturnValue({ set: updateSetMock });

  return {
    insert: insertMock,
    insertValues: insertValuesMock,
    insertReturning: insertReturningMock,
    select: selectMock,
    selectFrom: countFromMock,
    selectWhere: countWhereMock,
    update: updateMock,
    updateSet: updateSetMock,
    updateWhere: updateWhereMock,
    updateReturning: updateReturningMock,
    query: {
      workspaces: {
        findFirst: jest.fn().mockResolvedValue(mockWorkspace),
        findMany: jest.fn().mockResolvedValue([mockWorkspace]),
      },
    },
  };
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let db: ReturnType<typeof buildDbMock>;

  beforeEach(async () => {
    db = buildDbMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: DRIZZLE,
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    const createDto = {
      name: 'New Workspace',
      description: 'New Description',
    };
    const ownerId = 'owner-uuid-1';

    it('should successfully create and return a workspace', async () => {
      const createdWorkspace = {
        ...mockWorkspace,
        name: createDto.name,
        description: createDto.description,
      };
      db.insertReturning.mockResolvedValue([createdWorkspace]);

      const result = await service.create(createDto, ownerId);

      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(db.insertValues).toHaveBeenCalledWith({
        ownerId,
        name: createDto.name,
        description: createDto.description,
        icon: null,
      });
      expect(result).toEqual(createdWorkspace);
    });

    it('should default description to null if not provided', async () => {
      const createDtoWithoutDesc = { name: 'No Desc Workspace' };
      await service.create(createDtoWithoutDesc, ownerId);

      expect(db.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    const ownerId = 'owner-uuid-1';

    it('should find and return list of workspaces and count without cursor', async () => {
      const filter = { limit: 10, name: 'Baobab' };
      db.query.workspaces.findMany.mockResolvedValue([mockWorkspace]);
      db.selectWhere.mockResolvedValue([{ countValue: 1 }]);

      const result = await service.findAll(filter, ownerId);

      expect(db.query.workspaces.findFirst).not.toHaveBeenCalled();
      expect(db.query.workspaces.findMany).toHaveBeenCalledTimes(1);
      expect(db.select).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        items: [mockWorkspace],
        totalCount: 1,
        nextCursor: null,
      });
    });

    it('should resolve cursor date and apply cursor constraints when cursor is provided', async () => {
      const filter = { limit: 5, cursor: 'ws-uuid-1', order: OrderFilter.DESC };
      const cursorWorkspace = { ...mockWorkspace, createdAt: new Date('2026-06-19T10:00:00Z') };
      db.query.workspaces.findFirst.mockResolvedValue(cursorWorkspace);
      db.query.workspaces.findMany.mockResolvedValue([mockWorkspace]);
      db.selectWhere.mockResolvedValue([{ countValue: 1 }]);

      const result = await service.findAll(filter, ownerId);

      expect(db.query.workspaces.findFirst).toHaveBeenCalledTimes(1);
      expect(result.items).toEqual([mockWorkspace]);
    });

    it('should handle pagination next cursor when workspaces returned exceed limit', async () => {
      const filter = { limit: 2 };
      const list = [
        { ...mockWorkspace, id: 'ws-1' },
        { ...mockWorkspace, id: 'ws-2' },
        { ...mockWorkspace, id: 'ws-3' },
      ];
      db.query.workspaces.findMany.mockResolvedValue(list);
      db.selectWhere.mockResolvedValue([{ countValue: 3 }]);

      const result = await service.findAll(filter, ownerId);

      expect(result.items).toEqual(list.slice(0, 2));
      expect(result.nextCursor).toBe('ws-2');
      expect(result.totalCount).toBe(3);
    });

    it('should ignore cursor Date if cursor workspace is not found', async () => {
      const filter = { limit: 10, cursor: 'non-existent-uuid' };
      db.query.workspaces.findFirst.mockResolvedValue(undefined);
      db.query.workspaces.findMany.mockResolvedValue([mockWorkspace]);
      db.selectWhere.mockResolvedValue([{ countValue: 1 }]);

      const result = await service.findAll(filter, ownerId);

      expect(db.query.workspaces.findFirst).toHaveBeenCalledTimes(1);
      expect(result.items).toEqual([mockWorkspace]);
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    const id = 'ws-uuid-1';
    const ownerId = 'owner-uuid-1';

    it('should return workspace when found and belongs to user', async () => {
      db.query.workspaces.findFirst.mockResolvedValue(mockWorkspace);

      const result = await service.findOne(id, ownerId);

      expect(db.query.workspaces.findFirst).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspace);
    });

    it('should throw NotFoundException when workspace is not found', async () => {
      db.query.workspaces.findFirst.mockResolvedValue(undefined);

      await expect(service.findOne('invalid-id', ownerId)).rejects.toThrow(
        new NotFoundException('Workspace not found'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    const id = 'ws-uuid-1';
    const ownerId = 'owner-uuid-1';
    const updateDto = { name: 'Updated Workspace Name' };

    it('should update and return the workspace', async () => {
      const updatedWorkspace = { ...mockWorkspace, name: updateDto.name };
      db.query.workspaces.findFirst.mockResolvedValue(mockWorkspace);
      db.updateReturning.mockResolvedValue([updatedWorkspace]);

      const result = await service.update(id, updateDto, ownerId);

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(db.updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: updateDto.name,
        }),
      );
      expect(result).toEqual(updatedWorkspace);
    });
  });

  // -------------------------------------------------------------------------
  // softDelete
  // -------------------------------------------------------------------------
  describe('softDelete', () => {
    const id = 'ws-uuid-1';
    const ownerId = 'owner-uuid-1';

    it('should successfully soft delete a workspace', async () => {
      db.query.workspaces.findFirst.mockResolvedValue(mockWorkspace);
      const deletedWorkspace = { ...mockWorkspace, deletedAt: new Date() };
      db.updateReturning.mockResolvedValue([deletedWorkspace]);

      await service.softDelete(id, ownerId);

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(db.updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException if workspace is already deleted', async () => {
      const alreadyDeletedWorkspace = { ...mockWorkspace, deletedAt: new Date() };
      db.query.workspaces.findFirst.mockResolvedValue(alreadyDeletedWorkspace);
      db.updateReturning.mockResolvedValue([alreadyDeletedWorkspace]);

      await expect(service.softDelete(id, ownerId)).rejects.toThrow(
        new BadRequestException('Workspace already deleted'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // restore
  // -------------------------------------------------------------------------
  describe('restore', () => {
    const id = 'ws-uuid-1';
    const ownerId = 'owner-uuid-1';

    it('should successfully restore a deleted workspace', async () => {
      const deletedWorkspace = { ...mockWorkspace, deletedAt: new Date() };
      db.query.workspaces.findFirst.mockResolvedValue(deletedWorkspace);

      const restoredWorkspace = { ...mockWorkspace, deletedAt: null };
      db.updateReturning.mockResolvedValue([restoredWorkspace]);

      const result = await service.restore(id, ownerId);

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(db.updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
          updatedAt: expect.any(Date),
        }),
      );
      expect(result).toEqual(restoredWorkspace);
    });

    it('should throw BadRequestException if workspace is not deleted', async () => {
      db.query.workspaces.findFirst.mockResolvedValue(mockWorkspace);

      await expect(service.restore(id, ownerId)).rejects.toThrow(
        new BadRequestException('Workspace is not deleted'),
      );
    });

    it('should throw BadRequestException if update operation fails to return restored workspace', async () => {
      const deletedWorkspace = { ...mockWorkspace, deletedAt: new Date() };
      db.query.workspaces.findFirst.mockResolvedValue(deletedWorkspace);
      db.updateReturning.mockResolvedValue([]); // Empty array (simulating update failure)

      await expect(service.restore(id, ownerId)).rejects.toThrow(
        new BadRequestException('Workspace is not deleted'),
      );
    });
  });
});
