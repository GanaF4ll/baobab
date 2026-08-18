import { Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { TrashItem } from '../../models/trash.model';

export interface PermanentDeleteDialogContext {
  item: TrashItem;
}

@Component({
  selector: 'app-permanent-delete-dialog',
  standalone: true,
  imports: [HlmButton, HlmDialogImports],
  templateUrl: './permanent-delete-dialog.component.html',
})
export class PermanentDeleteDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);
  protected readonly context = injectBrnDialogContext<PermanentDeleteDialogContext>({
    optional: true,
  });

  protected readonly item = this.context?.item;

  cancel() {
    this.dialogRef.close(false);
  }

  confirm() {
    this.dialogRef.close(true);
  }
}
