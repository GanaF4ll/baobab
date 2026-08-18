import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RessourceTypeFilter } from '../../models/trash.model';
import { TrashStateService } from '../../services/trash-state.service';

interface FilterOption {
  key: RessourceTypeFilter | 'ALL';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-trash-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './trash-filter.component.html',
  styleUrls: [],
})
export class TrashFilterComponent {
  protected readonly state = inject(TrashStateService);

  protected readonly filterOptions: FilterOption[] = [
    { key: 'ALL', label: 'Tous', icon: 'auto_delete' },
    { key: 'Workspace', label: 'Workspaces', icon: 'workspaces' },
    { key: 'Document', label: 'Documents', icon: 'description' },
    { key: 'Conversation', label: 'Conversations', icon: 'chat_bubble' },
  ];

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.state.setSearchQuery(target.value);
  }

  clearSearch() {
    this.state.setSearchQuery('');
  }

  selectType(type: RessourceTypeFilter | 'ALL') {
    this.state.setSelectedType(type);
  }

  toggleSort() {
    this.state.toggleSortOrder();
  }
}
