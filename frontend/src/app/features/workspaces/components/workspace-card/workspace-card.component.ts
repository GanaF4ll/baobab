import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkspaceEntity } from '../../../../../client';

@Component({
  selector: 'app-workspace-card',
  imports: [NgClass],
  templateUrl: './workspace-card.component.html',
  styleUrls: [],
  host: {
    class: 'block h-full',
  },
})
export class WorkspaceCardComponent {
  @Input({ required: true }) workspace!: WorkspaceEntity;
  @Output() selectWorkspace = new EventEmitter<string>();

  onSelect() {
    this.selectWorkspace.emit(this.workspace.id);
  }

  get icon(): string {
    const name = this.workspace.name.toLowerCase();
    if (name.includes('legal')) return 'gavel';
    if (name.includes('alpha')) return 'rocket_launch';
    if (name.includes('financial') || name.includes('record')) return 'payments';
    return 'workspaces';
  }

  get syncText(): string {
    const name = this.workspace.name.toLowerCase();
    if (name.includes('legal')) return '75% Sync';
    if (name.includes('alpha')) return 'Synchronized';
    if (name.includes('financial') || name.includes('record')) return 'Indexing...';
    return 'Synchronized';
  }

  get syncPercent(): number {
    const name = this.workspace.name.toLowerCase();
    if (name.includes('legal')) return 75;
    if (name.includes('alpha')) return 100;
    if (name.includes('financial') || name.includes('record')) return 20;
    return 100;
  }

  get docCount(): number {
    const name = this.workspace.name.toLowerCase();
    if (name.includes('legal')) return 42;
    if (name.includes('alpha')) return 156;
    if (name.includes('financial') || name.includes('record')) return 89;
    if (this.workspace.id) {
      return (this.workspace.id.charCodeAt(0) % 20) + 5;
    }
    return 0;
  }

  get lastActive(): string {
    const lastUpdate = this.workspace.updatedAt;

    const now = new Date();
    const updateDate = new Date(lastUpdate);

    const diffMs = now.getTime() - updateDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Active Now';
    }
    if (diffMins < 60) {
      return `Active ${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `Active ${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `Active ${diffDays}d ago`;
    }
    return 'Active recently';
  }

  get descriptionText(): string {
    const desc = this.workspace.description;
    if (!desc) return 'No description provided.';
    if (typeof desc === 'string') return desc;
    if (typeof desc === 'object') {
      if ('text' in desc && typeof desc['text'] === 'string') return desc['text'];
      if ('content' in desc && typeof desc['content'] === 'string') return desc['content'];
      if ('description' in desc && typeof desc['description'] === 'string')
        return desc['description'];
    }
    return JSON.stringify(desc);
  }
}
