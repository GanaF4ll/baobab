import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderFilter } from 'src/shared/constants';
import { WorkspaceFilterDto } from 'src/workspaces/dto/input/workspace-filter.dto';
import { WorkspaceEntity } from 'src/workspaces/entities/workspace.entity';
import { WorkspacesController } from 'src/workspaces/workspaces.controller';
import { WorkspacesService } from 'src/workspaces/workspaces.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockWorkspace: WorkspaceEntity = {
  id: 'ws-uuid-1',
  name: 'Project Baobab',
  description: 'A test workspace',
  ownerId: 'owner-uuid-1',
  createdAt: new Date('2026-06-19T12:00:00Z'),
  updatedAt: new Date('2026-06-19T12:00:00Z'),
  deletedAt: null,
};

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  let workspacesService: jest.Mocked<WorkspacesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        {
          provide: WorkspacesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockWorkspace),
            findAll: jest.fn().mockResolvedValue({
              items: [mockWorkspace],
              totalCount: 1,
              nextCursor: null,
            }),
            findOne: jest.fn().mockResolvedValue(mockWorkspace),
            update: jest.fn().mockResolvedValue(mockWorkspace),
            restore: jest.fn().mockResolvedValue(mockWorkspace),
            softDelete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
    workspacesService = module.get(WorkspacesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should call workspacesService.create and return enveloped data', async () => {
      const createDto = { name: 'New Ws', description: 'Desc' };
      const ownerId = 'owner-uuid-1';

      const result = await controller.create(createDto, ownerId);

      expect(workspacesService.create).toHaveBeenCalledTimes(1);
      expect(workspacesService.create).toHaveBeenCalledWith(createDto, ownerId);
      expect(result).toEqual({ data: mockWorkspace });
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should call workspacesService.findAll and return enveloped collection data', async () => {
      const filter: WorkspaceFilterDto = { limit: 10, name: 'Baobab', order: OrderFilter.DESC };
      const ownerId = 'owner-uuid-1';

      const result = await controller.findAll(filter, ownerId);

      expect(workspacesService.findAll).toHaveBeenCalledTimes(1);
      expect(workspacesService.findAll).toHaveBeenCalledWith(filter, ownerId);
      expect(result).toEqual({
        data: {
          items: [mockWorkspace],
          totalCount: 1,
          nextCursor: null,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return workspace when active', async () => {
      const ownerId = 'owner-uuid-1';

      const result = await controller.findOne(mockWorkspace.id, ownerId);

      expect(workspacesService.findOne).toHaveBeenCalledTimes(1);
      expect(workspacesService.findOne).toHaveBeenCalledWith(mockWorkspace.id, ownerId);
      expect(result).toEqual({ data: mockWorkspace });
    });

    it('should throw NotFoundException if workspace is soft deleted (has deletedAt date)', async () => {
      const ownerId = 'owner-uuid-1';
      const deletedWorkspace = { ...mockWorkspace, deletedAt: new Date() };
      workspacesService.findOne.mockResolvedValueOnce(deletedWorkspace);

      await expect(controller.findOne(mockWorkspace.id, ownerId)).rejects.toThrow(
        new NotFoundException('Workspace not found'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('should update and return enveloped workspace', async () => {
      const updateDto = { name: 'Updated name' };
      const ownerId = 'owner-uuid-1';

      const result = await controller.update(mockWorkspace.id, updateDto, ownerId);

      expect(workspacesService.update).toHaveBeenCalledTimes(1);
      expect(workspacesService.update).toHaveBeenCalledWith(mockWorkspace.id, updateDto, ownerId);
      expect(result).toEqual({ data: mockWorkspace });
    });
  });

  // -------------------------------------------------------------------------
  // restore
  // -------------------------------------------------------------------------
  describe('restore', () => {
    it('should restore and return enveloped workspace', async () => {
      const ownerId = 'owner-uuid-1';

      const result = await controller.restore(mockWorkspace.id, ownerId);

      expect(workspacesService.restore).toHaveBeenCalledTimes(1);
      expect(workspacesService.restore).toHaveBeenCalledWith(mockWorkspace.id, ownerId);
      expect(result).toEqual({ data: mockWorkspace });
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------
  describe('remove', () => {
    it('should call softDelete and return void', async () => {
      const ownerId = 'owner-uuid-1';

      const result = await controller.remove(mockWorkspace.id, ownerId);

      expect(workspacesService.softDelete).toHaveBeenCalledTimes(1);
      expect(workspacesService.softDelete).toHaveBeenCalledWith(mockWorkspace.id, ownerId);
      expect(result).toBeUndefined();
    });
  });
});
