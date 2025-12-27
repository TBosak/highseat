import { Component, OnInit, OnDestroy, inject, computed, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faHome, faSquare, faCog, faBolt, faChevronRight, faClock, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { CommandPaletteService, SearchResult, SearchResultGroup } from '../../../core/services/command-palette.service';
import { SearchService, CardSearchResult } from '../../../core/services/search.service';
import { BoardService } from '../../../core/services/board.service';
import { BoardNavigationService } from '../../../core/services/board-navigation.service';
import { CardNavigationService } from '../../../core/services/card-navigation.service';
import { DesignModeService } from '../../../core/services/design-mode.service';
import { AddCardModalService } from '../../../core/services/add-card-modal.service';
import type { Board } from '../../../core/models';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './command-palette.component.html',
  styleUrls: ['./command-palette.component.scss']
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  private commandPalette = inject(CommandPaletteService);
  private searchService = inject(SearchService);
  private boardService = inject(BoardService);
  private boardNavigation = inject(BoardNavigationService);
  private cardNavigation = inject(CardNavigationService);
  private designMode = inject(DesignModeService);
  private addCardModal = inject(AddCardModalService);
  private router = inject(Router);

  // Icons
  faSearch = faSearch;
  faHome = faHome;
  faSquare = faSquare;
  faCog = faCog;
  faBolt = faBolt;
  faChevronRight = faChevronRight;
  faClock = faClock;

  boards = signal<Board[]>([]);
  cardResults = signal<CardSearchResult[]>([]);
  settingsResults = signal<Array<SearchResult & { path: string }>>([]);
  searchQuery = this.commandPalette.searchQuery;
  selectedIndex = this.commandPalette.selectedIndex;
  recentSearches = signal<string[]>([]);

  // Quick actions always available
  quickActions: SearchResult[] = [
    {
      id: 'create-board',
      type: 'action',
      title: 'Create New Board',
      icon: 'faPlus',
      action: () => {
        this.close();
        this.router.navigate(['/settings']);
      }
    },
    {
      id: 'add-card',
      type: 'action',
      title: 'Add Card',
      icon: 'faPlus',
      action: () => {
        this.close();
        this.addCardModal.open();
      }
    },
    {
      id: 'toggle-design',
      type: 'action',
      title: 'Toggle Design Mode',
      icon: 'faPencil',
      action: () => {
        this.close();
        this.designMode.toggle();
      }
    },
    {
      id: 'themes',
      type: 'action',
      title: 'Browse Themes',
      icon: 'faPalette',
      action: () => {
        this.close();
        this.router.navigate(['/themes']);
      }
    },
    {
      id: 'settings',
      type: 'action',
      title: 'Open Settings',
      icon: 'faCog',
      action: () => {
        this.close();
        this.router.navigate(['/settings']);
      }
    }
  ];

  // Effect to trigger search when query changes
  private searchEffect = effect(() => {
    const query = this.searchQuery().trim();

    if (!query) {
      this.cardResults.set([]);
      this.settingsResults.set([]);
      this.recentSearches.set(this.searchService.getRecentSearches());
      return;
    }

    // Use SearchService to search all types
    this.searchService.searchAll(query).subscribe({
      next: (results) => {
        this.cardResults.set(results.cards);
        this.settingsResults.set(results.settings);
      },
      error: (err) => {
        console.error('Search failed:', err);
        this.cardResults.set([]);
        this.settingsResults.set([]);
      }
    });
  });

  // Effect to scroll selected item into view
  private scrollEffect = effect(() => {
    const index = this.selectedIndex();

    // Wait for next tick to ensure DOM is updated
    setTimeout(() => {
      const selectedElement = document.querySelector('.palette-container .result-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }, 0);
  });

  // Computed search results
  searchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const groups: SearchResultGroup[] = [];

    // If no query, show recent searches and quick actions
    if (!query) {
      const recent = this.recentSearches();
      if (recent.length > 0) {
        groups.push({
          type: 'action',
          label: 'Recent Searches',
          results: recent.map(search => ({
            id: `recent-${search}`,
            type: 'action' as const,
            title: search,
            icon: 'faClock',
            action: () => {
              this.commandPalette.setSearchQuery(search);
            }
          }))
        });
      }

      groups.push({
        type: 'action',
        label: 'Quick Actions',
        results: this.quickActions
      });
      return groups;
    }

    // Search boards with fuzzy matching
    const boardResults = this.boards()
      .map(board => {
        const match = this.searchService.fuzzyMatch(query, board.name);
        return { board, match };
      })
      .filter(({ match }) => match.match)
      .sort((a, b) => b.match.score - a.match.score)
      .map(({ board }) => ({
        id: board.id,
        type: 'board' as const,
        title: board.name,
        subtitle: 'Board',
        icon: board.icon || 'faHome',
        action: () => {
          this.searchService.addRecentSearch(query);
          this.close();
          this.boardNavigation.selectBoard(board.slug);
          this.router.navigate(['/']);
        }
      }));

    if (boardResults.length > 0) {
      groups.push({
        type: 'board',
        label: 'Boards',
        results: boardResults
      });
    }

    // Card results
    const cardSearchResults = this.cardResults().map(card => ({
      id: card.id,
      type: 'card' as const,
      title: card.title,
      subtitle: card.subtitle || undefined,
      breadcrumb: `${card.boardName} > ${card.tabName} > ${card.zoneName}`,
      icon: 'faSquare',
      action: () => {
        this.searchService.addRecentSearch(query);
        this.close();

        // If card has a URL, open it in new tab
        if (card.meta?.url) {
          window.open(card.meta.url, '_blank');
        }

        // Always navigate to and highlight the card on its board
        this.cardNavigation.navigateToCard(card.id, card.boardSlug);
        this.router.navigate(['/']);
      }
    }));

    if (cardSearchResults.length > 0) {
      groups.push({
        type: 'card',
        label: 'Cards',
        results: cardSearchResults
      });
    }

    // Settings results
    if (this.settingsResults().length > 0) {
      groups.push({
        type: 'setting',
        label: 'Settings',
        results: this.settingsResults().map(setting => ({
          ...setting,
          action: () => {
            this.searchService.addRecentSearch(query);
            this.close();
            this.router.navigate([setting.path]);
          }
        }))
      });
    }

    // Search quick actions with fuzzy matching
    const actionResults = this.quickActions
      .map(action => {
        const match = this.searchService.fuzzyMatch(query, action.title);
        return { action, match };
      })
      .filter(({ match }) => match.match)
      .sort((a, b) => b.match.score - a.match.score)
      .map(({ action }) => ({
        ...action,
        action: () => {
          this.searchService.addRecentSearch(query);
          action.action();
        }
      }));

    if (actionResults.length > 0) {
      groups.push({
        type: 'action',
        label: 'Actions',
        results: actionResults
      });
    }

    return groups;
  });

  // Flatten all results for keyboard navigation
  allResults = computed(() => {
    const groups = this.searchResults();
    return groups.flatMap(group => group.results);
  });

  ngOnInit(): void {
    this.loadBoards();
    this.recentSearches.set(this.searchService.getRecentSearches());
  }

  ngOnDestroy(): void {
    // Clean up if needed
  }

  loadBoards(): void {
    this.boardService.getBoards().subscribe({
      next: (boards) => {
        this.boards.set(boards);
      },
      error: (err) => {
        console.error('Failed to load boards for search:', err);
      }
    });
  }

  onSearchInput(value: string): void {
    this.commandPalette.setSearchQuery(value);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Only handle keyboard events when the palette is open
    if (!this.commandPalette.isOpen()) {
      return;
    }

    const results = this.allResults();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.commandPalette.moveSelection('down', results.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.commandPalette.moveSelection('up', results.length);
        break;
      case 'Enter':
        event.preventDefault();
        const selected = results[this.selectedIndex()];
        if (selected) {
          selected.action();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  selectResult(result: SearchResult): void {
    result.action();
  }

  close(): void {
    this.commandPalette.close();
  }

  getIcon(iconName?: string): IconDefinition | null {
    if (!iconName) return this.faSquare;

    try {
      const icon = (solidIcons as any)[iconName];
      return icon || this.faSquare;
    } catch {
      return this.faSquare;
    }
  }

  trackByGroup(index: number, group: SearchResultGroup): string {
    return group.type;
  }

  trackByResult(index: number, result: SearchResult): string {
    return result.id;
  }

  // Get flat index for a result within all results
  getResultIndex(groupIndex: number, resultIndex: number): number {
    const groups = this.searchResults();
    let flatIndex = 0;

    for (let i = 0; i < groupIndex; i++) {
      flatIndex += groups[i].results.length;
    }

    return flatIndex + resultIndex;
  }
}
