import { Component, inject, signal } from '@angular/core';
import { form, required, validate } from '@angular/forms/signals';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';

function isOnlyEmoji(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;

  // Reject string if it contains any digits (0-9) or ASCII letters (a-z, A-Z)
  if (/[0-9a-zA-Z]/.test(trimmed)) {
    return false;
  }

  // Regex matching extended pictographic emoji symbols
  const regex = /^(\p{Extended_Pictographic}|\u200d|\ufe0f)+$/u;
  return regex.test(trimmed);
}

@Component({
  selector: 'app-rename-workspace-dialog',
  imports: [HlmButton, HlmInput, HlmDialogImports],
  templateUrl: './rename-workspace-dialog.component.html',
  styles: [],
})
export class RenameWorkspaceDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);
  private readonly dialogContext = injectBrnDialogContext<{
    workspaceName: string;
    workspaceDescription?: string | null;
    workspaceIcon?: string | null;
  } | null>({
    optional: true,
  });

  protected readonly popularEmojis = [
    '📁',
    '💼',
    '🚀',
    '🔒',
    '⚡',
    '📊',
    '💡',
    '🧠',
    '🏢',
    '📚',
    '🔍',
    '⚙️',
    '🎯',
    '🎨',
    '📜',
    '🏷️',
    '🛡️',
    '💬',
  ];

  protected readonly model = signal({
    icon: this.dialogContext?.workspaceIcon || '📁',
    name: this.dialogContext?.workspaceName || '',
    description: this.dialogContext?.workspaceDescription || '',
  });

  protected readonly renameForm = form(this.model, (p) => {
    required(p.name, { message: 'Le nom du workspace est obligatoire.' });
    validate(p.icon, (ctx) => {
      const val = (ctx.valueOf(p.icon) || '').trim();
      if (val && !isOnlyEmoji(val)) {
        return {
          kind: 'emoji',
          message: "L'icône ne peut contenir que des emojis.",
        };
      }
      return undefined;
    });
  });

  selectEmoji(emoji: string) {
    this.model.update((m) => ({ ...m, icon: emoji }));
  }

  onNameInput(value: string) {
    this.model.update((m) => ({ ...m, name: value }));
  }

  onDescriptionInput(value: string) {
    this.model.update((m) => ({ ...m, description: value }));
  }

  onIconInput(value: string) {
    this.model.update((m) => ({ ...m, icon: value }));
  }

  cancel() {
    this.dialogRef.close();
  }

  submit() {
    if (this.renameForm().invalid()) {
      return;
    }

    const { name, description, icon } = this.model();
    this.dialogRef.close({
      name: name.trim(),
      description: (description || '').trim(),
      icon: (icon || '').trim() || undefined,
    });
  }
}
