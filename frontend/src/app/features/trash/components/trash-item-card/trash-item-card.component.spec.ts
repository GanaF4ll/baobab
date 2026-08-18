import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrashItem } from '../../models/trash.model';
import { TrashItemCardComponent } from './trash-item-card.component';

describe('TrashItemCardComponent', () => {
  let component: TrashItemCardComponent;
  let fixture: ComponentFixture<TrashItemCardComponent>;

  const mockItem: TrashItem = {
    id: 'doc-123',
    type: 'document',
    title: 'Financial Report 2026.pdf',
    workspaceId: 'ws-456',
    workspaceName: 'Finance Silo',
    deletedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      mimeType: 'application/pdf',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrashItemCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TrashItemCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('item', mockItem);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate days left and retention percentage correctly', () => {
    expect(component['daysLeft']()).toBeGreaterThanOrEqual(24);
    expect(component['retentionPercent']()).toBeGreaterThan(0);
  });

  it('should allow permanent delete for document types only', () => {
    expect(component['canPermanentlyDelete']()).toBe(true);

    fixture.componentRef.setInput('item', {
      ...mockItem,
      type: 'workspace',
    });
    fixture.detectChanges();
    expect(component['canPermanentlyDelete']()).toBe(false);
  });

  it('should emit restore event on restore button click', () => {
    const restoreSpy = vi.fn();
    component.restore.subscribe(restoreSpy);

    const event = new MouseEvent('click');
    component.onRestore(event);

    expect(restoreSpy).toHaveBeenCalledWith(mockItem);
  });

  it('should emit permanentDelete event on delete button click', () => {
    const deleteSpy = vi.fn();
    component.permanentDelete.subscribe(deleteSpy);

    const event = new MouseEvent('click');
    component.onPermanentDelete(event);

    expect(deleteSpy).toHaveBeenCalledWith(mockItem);
  });
});
