import { Injectable, signal } from '@angular/core';

export interface SearchResult {
  id: string;
  type: 'board' | 'card' | 'widget' | 'setting' | 'action';
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  icon?: string;
  score?: number;
  action: () => void;
}

export interface SearchResultGroup {
  type: string;
  label: string;
  results: SearchResult[];
}

@Injectable({
  providedIn: 'root'
})
export class CommandPaletteService {
  isOpen = signal(false);
  searchQuery = signal('');
  selectedIndex = signal(0);

  open(): void {
    this.isOpen.set(true);
    this.searchQuery.set('');
    this.selectedIndex.set(0);
  }

  close(): void {
    this.isOpen.set(false);
    this.searchQuery.set('');
    this.selectedIndex.set(0);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.selectedIndex.set(0); // Reset selection when query changes
  }

  moveSelection(direction: 'up' | 'down', totalResults: number): void {
    const current = this.selectedIndex();
    if (direction === 'up') {
      this.selectedIndex.set(current > 0 ? current - 1 : totalResults - 1);
    } else {
      this.selectedIndex.set(current < totalResults - 1 ? current + 1 : 0);
    }
  }
}
