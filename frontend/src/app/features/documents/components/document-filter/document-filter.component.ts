import { Component, output, signal } from '@angular/core';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { MimeType } from '../../../../core/constants/mime-type';

@Component({
  selector: 'app-document-filter',
  imports: [HlmTabsImports],
  templateUrl: './document-filter.component.html',
  styleUrl: './document-filter.component.css',
})
export class DocumentFilterComponent {
  protected readonly mimeTypes = signal(MimeType);
  protected selectedMimeType = output<string | null>();

  protected onTabChange(type: string | null) {
    this.selectedMimeType.emit(type);
  }
}
