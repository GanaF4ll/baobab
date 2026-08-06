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
}
