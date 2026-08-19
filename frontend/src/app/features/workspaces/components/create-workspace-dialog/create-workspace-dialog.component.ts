import { Component, inject, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';

@Component({
  selector: 'app-create-workspace-dialog',
  imports: [HlmButton, HlmInput, HlmDialogImports],
  templateUrl: './create-workspace-dialog.component.html',
  styles: [],
})
export class CreateWorkspaceDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);

  protected readonly model = signal({
    name: '',
    description: '',
  });

  protected readonly createForm = form(this.model, (p) => {
    required(p.name, { message: 'Workspace name is required.' });
  });

  onNameInput(value: string) {
    this.model.update((m) => ({ ...m, name: value }));
  }

  onDescriptionInput(value: string) {
    this.model.update((m) => ({ ...m, description: value }));
  }

  cancel() {
    this.dialogRef.close();
  }

  submit() {
    if (this.createForm().invalid()) {
      return;
    }

    const { name, description } = this.model();
    this.dialogRef.close({
      name: name.trim(),
      description: (description || '').trim(),
    });
  }
}
