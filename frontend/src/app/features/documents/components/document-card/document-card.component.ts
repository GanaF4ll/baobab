import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { DocumentEntity } from '../../../../../client/models';

@Component({
  selector: 'app-document-card',
  standalone: true,
  imports: [HlmCardImports, DatePipe],
  templateUrl: './document-card.component.html',
  styleUrl: './document-card.component.css',
  host: {
    class: 'block h-full',
  },
})
export class DocumentCardComponent {
  document = input.required<DocumentEntity>();

  protected getIconName(mimeType: string): string {
    switch (mimeType) {
      case 'application/pdf':
        return 'picture_as_pdf';
      case 'text/markdown':
        return 'markdown';
      case 'text/plain':
        return 'description';
      default:
        return 'draft';
    }
  }

  protected getIconColorClass(mimeType: string): string {
    switch (mimeType) {
      case 'application/pdf':
        return 'text-error bg-error-container/10 border border-error/20';
      case 'text/markdown':
        return 'text-secondary bg-secondary-container/10 border border-secondary/20';
      case 'text/plain':
        return 'text-primary bg-primary-fixed/20 border border-primary/20';
      default:
        return 'text-on-surface-variant bg-surface-variant/20 border border-outline-variant/30';
    }
  }

  protected getFileTypeLabel(mimeType: string): string {
    switch (mimeType) {
      case 'application/pdf':
        return 'PDF';
      case 'text/markdown':
        return 'Markdown';
      case 'text/plain':
        return 'Plain Text';
      default:
        return 'Document';
    }
  }
}
