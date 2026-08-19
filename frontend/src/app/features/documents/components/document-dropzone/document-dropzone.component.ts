import { Component, inject, output, signal } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { WorkspacesStateService } from '../../../workspaces/services/workspaces-state.service';

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
export class DocumentDropzoneComponent {
  private readonly state = inject(WorkspacesStateService);

  fileSelected = output<File>();

  protected readonly isDragging = signal(false);

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  protected onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFile(file);
    }
  }

  protected onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.handleFile(file);
      // Reset input value to allow selecting same file again
      input.value = '';
    }
  }

  private handleFile(file: File) {
    if (this.isValidFileType(file)) {
      this.fileSelected.emit(file);
    } else {
      this.state.showToast(
        'Invalid File Type',
        `'${file.name}' is not supported. Please upload a PDF or Markdown (.md) file.`,
      );
    }
  }

  private isValidFileType(file: File): boolean {
    const allowedExtensions = ['pdf', 'md', 'markdown'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return !!fileExtension && allowedExtensions.includes(fileExtension);
  }
}
