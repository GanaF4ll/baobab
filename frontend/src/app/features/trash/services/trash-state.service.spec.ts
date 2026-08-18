import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConversationsService } from '../../../../client/services/conversations.service';
import { DocumentsService } from '../../../../client/services/documents.service';
import { WorkspacesService } from '../../../../client/services/workspaces.service';
import { BASE_PATH_DEFAULT } from '../../../../client/tokens';
import { TrashItem } from '../models/trash.model';
import { TrashStateService } from './trash-state.service';

describe('TrashStateService', () => {
  let service: TrashStateService;
  let workspacesServiceMock: any;
  let documentsServiceMock: any;
  let conversationsServiceMock: any;

  beforeEach(() => {
    workspacesServiceMock = {
      workspacesControllerRestore: vi.fn().mockReturnValue(of({})),
    };
    documentsServiceMock = {
      documentsControllerRestoreDocument: vi.fn().mockReturnValue(of({})),
      documentsControllerRemoveDocument: vi.fn().mockReturnValue(of({})),
    };
    conversationsServiceMock = {
      conversationsControllerRestore: vi.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [
        TrashStateService,
        provideHttpClient(),
        { provide: BASE_PATH_DEFAULT, useValue: 'http://localhost:2400' },
        { provide: WorkspacesService, useValue: workspacesServiceMock },
        { provide: DocumentsService, useValue: documentsServiceMock },
        { provide: ConversationsService, useValue: conversationsServiceMock },
      ],
    });

    service = TestBed.inject(TrashStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update search query', () => {
    service.setSearchQuery('test search');
    expect(service.searchQuery()).toBe('test search');
    expect(service.hasActiveFilters()).toBe(true);
  });

  it('should update selected resource type', () => {
    service.setSelectedType('Document');
    expect(service.selectedType()).toBe('Document');
    expect(service.hasActiveFilters()).toBe(true);
  });

  it('should toggle sort order', () => {
    expect(service.sortOrder()).toBe('desc');
    service.toggleSortOrder();
    expect(service.sortOrder()).toBe('asc');
    service.toggleSortOrder();
    expect(service.sortOrder()).toBe('desc');
  });

  it('should reset filters', () => {
    service.setSearchQuery('some query');
    service.setSelectedType('Workspace');
    service.resetFilters();
    expect(service.searchQuery()).toBe('');
    expect(service.selectedType()).toBe('ALL');
    expect(service.hasActiveFilters()).toBe(false);
  });

  it('should restore workspace item', () => {
    const item: TrashItem = {
      id: 'ws-1',
      type: 'workspace',
      title: 'Test Workspace',
      deletedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };

    service.restoreItem(item);
    expect(workspacesServiceMock.workspacesControllerRestore).toHaveBeenCalledWith('ws-1');
  });

  it('should restore document item', () => {
    const item: TrashItem = {
      id: 'doc-1',
      type: 'document',
      title: 'Test Document',
      workspaceId: 'ws-1',
      deletedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };

    service.restoreItem(item);
    expect(documentsServiceMock.documentsControllerRestoreDocument).toHaveBeenCalledWith({
      id: 'doc-1',
      workspaceId: 'ws-1',
    });
  });

  it('should restore conversation item', () => {
    const item: TrashItem = {
      id: 'conv-1',
      type: 'conversation',
      title: 'Test Conversation',
      workspaceId: 'ws-1',
      deletedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };

    service.restoreItem(item);
    expect(conversationsServiceMock.conversationsControllerRestore).toHaveBeenCalledWith(
      'conv-1',
      'ws-1',
    );
  });

  it('should permanently delete document item', () => {
    const item: TrashItem = {
      id: 'doc-1',
      type: 'document',
      title: 'Test Document',
      workspaceId: 'ws-1',
      deletedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };

    service.permanentlyDeleteItem(item);
    expect(documentsServiceMock.documentsControllerRemoveDocument).toHaveBeenCalledWith({
      id: 'doc-1',
      workspaceId: 'ws-1',
    });
  });

  it('should show and close toast', () => {
    service.showToast('Test Title', 'Test Message');
    expect(service.toast().visible).toBe(true);
    expect(service.toast().title).toBe('Test Title');
    expect(service.toast().message).toBe('Test Message');

    service.closeToast();
    expect(service.toast().visible).toBe(false);
  });
});
