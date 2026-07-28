import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';

@Component({
  selector: 'app-rename-conversation-dialog',
  imports: [FormsModule, HlmButton, HlmInput, HlmDialogImports],
  templateUrl: './rename-conversation-dialog.component.html',
  styles: [],
})
export class RenameConversationDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);
  private readonly dialogContext = injectBrnDialogContext<{ conversationTitle: string } | null>({
    optional: true,
  });

  protected title = this.dialogContext?.conversationTitle || '';

  cancel() {
    this.dialogRef.close();
  }

  submit() {
    if (!this.title.trim()) return;
    this.dialogRef.close(this.title.trim());
  }
}
