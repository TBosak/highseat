import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BoardNavigationService {
  // Signal to communicate board selection across components
  selectedBoardSlug = signal<string | null>(null);

  selectBoard(slug: string): void {
    this.selectedBoardSlug.set(slug);
  }

  clearSelection(): void {
    this.selectedBoardSlug.set(null);
  }
}
