import { Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

export interface TrashVersionDialogContext {
  documentTitle: string;
  versionNumber: number;
  isLastVersion: boolean;
  isCurrentVersion: boolean;
}

@Component({
  selector: 'app-trash-version-dialog',
  standalone: true,
  imports: [HlmButton, HlmDialogImports],
  templateUrl: './trash-version-dialog.component.html',
})
export class TrashVersionDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);
  protected readonly context = injectBrnDialogContext<TrashVersionDialogContext>({
    optional: true,
  });

  protected readonly documentTitle = this.context?.documentTitle || 'Document';
  protected readonly versionNumber = this.context?.versionNumber || 1;
  protected readonly isLastVersion = !!this.context?.isLastVersion;
  protected readonly isCurrentVersion = !!this.context?.isCurrentVersion;

  cancel() {
    this.dialogRef.close(false);
  }

  confirm() {
    this.dialogRef.close(true);
  }
}
