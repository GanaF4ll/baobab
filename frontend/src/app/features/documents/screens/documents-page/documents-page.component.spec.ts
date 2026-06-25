import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsPageComponent } from './documents-page.component';

describe('DocumentsPageComponent', () => {
  let component: DocumentsPageComponent;
  let fixture: ComponentFixture<DocumentsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentsPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
