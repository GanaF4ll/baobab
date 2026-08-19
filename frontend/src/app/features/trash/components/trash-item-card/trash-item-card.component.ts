import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { TrashItem } from '../../models/trash.model';

@Component({
  selector: 'app-trash-item-card',
  standalone: true,
  imports: [HlmCardImports, DatePipe],
  templateUrl: './trash-item-card.component.html',
  host: {
    class: 'block h-full',
  },
})
export class TrashItemCardComponent {
  item = input.required<TrashItem>();

  restore = output<TrashItem>();
  permanentDelete = output<TrashItem>();

  protected readonly daysLeft = computed(() => {
    const expires = new Date(this.item().expiresAt).getTime();
    const now = Date.now();
    const diff = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  });

  protected readonly retentionPercent = computed(() => {
    const days = this.daysLeft();
    return Math.max(0, Math.min(100, Math.round((days / 30) * 100)));
  });

  protected readonly canPermanentlyDelete = computed(() => this.item().type === 'document');

  protected getIcon(): string {
    const item = this.item();
    if (item.type === 'workspace') return item.metadata?.icon || 'workspaces';
    if (item.type === 'conversation') return 'chat_bubble';
    if (item.type === 'document') {
      const mime = item.metadata?.mimeType;
      if (mime === 'application/pdf') return 'picture_as_pdf';
      if (mime === 'text/markdown') return 'markdown';
      return 'description';
    }
    return 'delete';
  }

  protected getIconWrapperClasses(): string {
    const type = this.item().type;
    if (type === 'workspace') {
      return 'text-primary bg-primary-fixed/20 border-primary/20';
    }
    if (type === 'conversation') {
      return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
    const mime = this.item().metadata?.mimeType;
    if (mime === 'application/pdf') {
      return 'text-error bg-error-container/15 border-error/25';
    }
    return 'text-secondary bg-secondary-container/20 border-secondary/25';
  }

  protected getTypeBadgeClasses(): string {
    const type = this.item().type;
    if (type === 'workspace') {
      return 'bg-primary/10 text-primary border-primary/20';
    }
    if (type === 'conversation') {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
    }
    return 'bg-secondary/10 text-secondary border-secondary/20';
  }

  protected getTypeLabel(): string {
    const item = this.item();
    if (item.type === 'workspace') return 'Workspace';
    if (item.type === 'conversation') return 'Conversation';
    if (item.type === 'document') {
      const mime = item.metadata?.mimeType;
      if (mime === 'application/pdf') return 'Document PDF';
      if (mime === 'text/markdown') return 'Document MD';
      return 'Document';
    }
    return 'Ressource';
  }

  onRestore(event: MouseEvent) {
    event.stopPropagation();
    this.restore.emit(this.item());
  }

  onPermanentDelete(event: MouseEvent) {
    event.stopPropagation();
    this.permanentDelete.emit(this.item());
  }
}
