import { Component } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-document-dropzone',
  standalone: true,
  imports: [HlmCardImports],
  templateUrl: './document-dropzone.component.html',
  styleUrl: './document-dropzone.component.css',
  host: {
    class: 'block h-full',
  },
})
export class DocumentDropzoneComponent {}
