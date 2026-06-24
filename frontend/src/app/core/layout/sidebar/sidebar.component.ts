import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, HlmButton],
  templateUrl: './sidebar.component.html',
  styleUrls: []
})
export class SidebarComponent {
  @Output() uploadClick = new EventEmitter<void>();

  onUpload() {
    this.uploadClick.emit();
  }
}
