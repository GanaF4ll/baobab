import { Component, inject, signal } from '@angular/core';
import { form, required } from '@angular/forms/signals';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';

@Component({
  selector: 'app-rename-conversation-dialog',
  imports: [HlmButton, HlmInput, HlmDialogImports],
  templateUrl: './rename-conversation-dialog.component.html',
  styles: [],
})
export class RenameConversationDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);
  private readonly dialogContext = injectBrnDialogContext<{ conversationTitle: string } | null>({
    optional: true,
  });

  protected readonly model = signal({
    title: this.dialogContext?.conversationTitle || '',
  });

  protected readonly renameForm = form(this.model, (p) => {
    required(p.title, { message: 'Le titre de la conversation est obligatoire.' });
  });

  onTitleInput(value: string) {
    this.model.update((m) => ({ ...m, title: value }));
  }

  cancel() {
    this.dialogRef.close();
  }

  submit() {
    if (this.renameForm().invalid()) {
      return;
    }

    const { title } = this.model();
    this.dialogRef.close(title.trim());
  }
}
