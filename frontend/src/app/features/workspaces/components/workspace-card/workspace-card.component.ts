import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkspaceEntity } from '../../../../../client';

@Component({
  selector: 'app-workspace-card',
  imports: [DatePipe],
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
}
