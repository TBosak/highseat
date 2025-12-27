import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BoardService } from './board.service';
import type { Board } from '../models';

export interface SearchResult {
  id: string;
  type: 'board' | 'card' | 'widget' | 'setting' | 'action';
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  icon?: string;
  score: number;
  action: () => void;
}

export interface CardSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  meta?: { url?: string; [key: string]: any };
  boardName: string;
  boardSlug: string;
  tabName: string;
  zoneName: string;
  widgets?: Array<{ type: string }>;
}

export interface SettingPage {
  id: string;
  title: string;
  path: string;
  keywords: string[];
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);
  private boardService = inject(BoardService);

  // Predefined settings pages for search
  private settingsPages: SettingPage[] = [
    {
      id: 'themes',
      title: 'Browse Themes',
      path: '/themes',
      keywords: ['theme', 'color', 'style', 'appearance', 'dark', 'light'],
      icon: 'faPalette'
    },
    {
      id: 'settings',
      title: 'Settings',
      path: '/settings',
      keywords: ['settings', 'config', 'preferences', 'boards', 'manage'],
      icon: 'faCog'
    },
    {
      id: 'user-settings',
      title: 'User Management',
      path: '/settings',
      keywords: ['users', 'roles', 'permissions', 'access', 'rbac'],
      icon: 'faUsers'
    }
  ];

  // Fuzzy match implementation
  fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
    query = query.toLowerCase();
    target = target.toLowerCase();

    // Exact match gets highest score
    if (target === query) {
      return { match: true, score: 100 };
    }

    // Starts with gets high score
    if (target.startsWith(query)) {
      return { match: true, score: 90 };
    }

    // Contains gets medium score
    if (target.includes(query)) {
      return { match: true, score: 80 };
    }

    // Fuzzy match: all characters appear in order
    let queryIndex = 0;
    let targetIndex = 0;
    let matches = 0;

    while (queryIndex < query.length && targetIndex < target.length) {
      if (query[queryIndex] === target[targetIndex]) {
        queryIndex++;
        matches++;
      }
      targetIndex++;
    }

    if (queryIndex === query.length) {
      // All query characters found in order
      const score = Math.floor((matches / target.length) * 70);
      return { match: true, score };
    }

    return { match: false, score: 0 };
  }

  // Search boards with fuzzy matching
  searchBoards(query: string): Observable<SearchResult[]> {
    return this.boardService.getBoards().pipe(
      map(boards => {
        const results: SearchResult[] = [];

        boards.forEach(board => {
          const nameMatch = this.fuzzyMatch(query, board.name);

          if (nameMatch.match) {
            results.push({
              id: board.id,
              type: 'board',
              title: board.name,
              subtitle: 'Board',
              icon: board.icon || 'faHome',
              score: nameMatch.score,
              action: () => {} // Will be set by component
            });
          }
        });

        return results.sort((a, b) => b.score - a.score);
      }),
      catchError(() => of([]))
    );
  }

  // Search cards via backend API
  searchCards(query: string): Observable<CardSearchResult[]> {
    return this.http.get<CardSearchResult[]>(`/api/cards/search?q=${encodeURIComponent(query)}`).pipe(
      catchError(() => of([]))
    );
  }

  // Search settings pages
  searchSettings(query: string): Array<SearchResult & { path: string }> {
    const results: Array<SearchResult & { path: string }> = [];

    this.settingsPages.forEach(page => {
      // Check title match
      const titleMatch = this.fuzzyMatch(query, page.title);

      // Check keywords match
      const keywordMatch = page.keywords.some(keyword =>
        this.fuzzyMatch(query, keyword).match
      );

      if (titleMatch.match || keywordMatch) {
        results.push({
          id: page.id,
          type: 'setting',
          title: page.title,
          subtitle: 'Settings',
          icon: page.icon,
          score: titleMatch.score,
          path: page.path,
          action: () => {} // Will be set by component
        });
      }
    });

    return results.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Comprehensive search across all types
  searchAll(query: string): Observable<{
    boards: SearchResult[];
    cards: CardSearchResult[];
    settings: Array<SearchResult & { path: string }>;
  }> {
    if (!query.trim()) {
      return of({ boards: [], cards: [], settings: [] });
    }

    return forkJoin({
      boards: this.searchBoards(query),
      cards: this.searchCards(query),
      settings: of(this.searchSettings(query))
    });
  }

  // Recent searches management (localStorage)
  private readonly RECENT_SEARCHES_KEY = 'highseat_recent_searches';
  private readonly MAX_RECENT_SEARCHES = 5;

  getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem(this.RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  addRecentSearch(query: string): void {
    if (!query.trim()) return;

    try {
      let recent = this.getRecentSearches();

      // Remove if already exists
      recent = recent.filter(q => q !== query);

      // Add to beginning
      recent.unshift(query);

      // Keep only MAX_RECENT_SEARCHES
      recent = recent.slice(0, this.MAX_RECENT_SEARCHES);

      localStorage.setItem(this.RECENT_SEARCHES_KEY, JSON.stringify(recent));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }

  clearRecentSearches(): void {
    try {
      localStorage.removeItem(this.RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }
}
