import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-upload-box',
  standalone: true,
  imports: [],
  templateUrl: './upload-box.html',
  styleUrl: './upload-box.scss'
})
export class UploadBox {
  @Output() imageSelected = new EventEmitter<string>();

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const imageUrl = URL.createObjectURL(file);

    this.imageSelected.emit(imageUrl);
  }
}