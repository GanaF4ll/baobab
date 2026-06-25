import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

@Component({
  selector: 'app-create-workspace-dialog',
  imports: [FormsModule, HlmButton, HlmInput, HlmDialogImports],
  templateUrl: './create-workspace-dialog.component.html',
  styles: []
})
export class CreateWorkspaceDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);

  protected name = '';
  protected description = '';

  cancel() {
    this.dialogRef.close();
  }

  submit() {
    if (!this.name.trim()) return;
    this.dialogRef.close({
      name: this.name.trim(),
      description: this.description.trim()
    });
  }
}
