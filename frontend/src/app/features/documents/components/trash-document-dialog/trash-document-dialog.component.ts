import { Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

export interface TrashDocumentDialogContext {
  documentTitle: string;
  versionCount: number;
}

@Component({
  selector: 'app-trash-document-dialog',
  standalone: true,
  imports: [HlmButton, HlmDialogImports],
  templateUrl: './trash-document-dialog.component.html',
})
export class TrashDocumentDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);
  protected readonly context = injectBrnDialogContext<TrashDocumentDialogContext>({
    optional: true,
  });

  protected readonly documentTitle = this.context?.documentTitle || 'Document';
  protected readonly versionCount = this.context?.versionCount || 1;

  cancel() {
    this.dialogRef.close(false);
  }

  confirm() {
    this.dialogRef.close(true);
  }
}
