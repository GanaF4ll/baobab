import { Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

export interface TrashWorkspaceDialogContext {
  workspaceName: string;
  workspaceIcon?: string | null;
  documentCount?: number;
}

@Component({
  selector: 'app-trash-workspace-dialog',
  standalone: true,
  imports: [HlmButton, HlmDialogImports],
  templateUrl: './trash-workspace-dialog.component.html',
})
export class TrashWorkspaceDialogComponent {
  private readonly dialogRef = inject(BrnDialogRef);
  protected readonly context = injectBrnDialogContext<TrashWorkspaceDialogContext>({
    optional: true,
  });

  protected readonly workspaceName = this.context?.workspaceName || 'Workspace';
  protected readonly workspaceIcon = this.context?.workspaceIcon || '📁';
  protected readonly documentCount = this.context?.documentCount || 0;

  cancel() {
    this.dialogRef.close(false);
  }

  confirm() {
    this.dialogRef.close(true);
  }
}
