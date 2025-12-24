import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IconPickerModalService {
  showModal = signal(false);
  boardId = signal<string | null>(null);

  open(boardId: string): void {
    this.boardId.set(boardId);
    this.showModal.set(true);
  }

  close(): void {
    this.showModal.set(false);
    this.boardId.set(null);
  }
}
