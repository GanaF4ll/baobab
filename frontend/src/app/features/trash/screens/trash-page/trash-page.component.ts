import { Component, inject } from '@angular/core';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HeaderComponent } from '../../../../core/layout/header/header.component';
import { SidebarComponent } from '../../../../core/layout/sidebar/sidebar.component';
import { SidebarService } from '../../../../core/services/sidebar.service';
import { PermanentDeleteDialogComponent } from '../../components/permanent-delete-dialog/permanent-delete-dialog.component';
import { TrashFilterComponent } from '../../components/trash-filter/trash-filter.component';
import { TrashItemCardComponent } from '../../components/trash-item-card/trash-item-card.component';
import { TrashItem } from '../../models/trash.model';
import { TrashStateService } from '../../services/trash-state.service';

@Component({
  selector: 'app-trash-page',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent, TrashFilterComponent, TrashItemCardComponent],
  templateUrl: './trash-page.component.html',
  styleUrl: './trash-page.component.css',
})
export class TrashPageComponent {
  protected readonly state = inject(TrashStateService);
  protected readonly sidebarService = inject(SidebarService);
  private readonly hlmDialogService = inject(HlmDialogService);

  onRestore(item: TrashItem) {
    this.state.restoreItem(item);
  }

  onPermanentDelete(item: TrashItem) {
    const dialogRef = this.hlmDialogService.open(PermanentDeleteDialogComponent, {
      context: {
        item,
      },
      contentClass:
        'max-w-md p-6 bg-surface-container-low border border-outline-variant rounded-2xl shadow-xl',
    });

    dialogRef.closed$.subscribe((confirmed) => {
      if (confirmed) {
        this.state.permanentlyDeleteItem(item);
      }
    });
  }
}
