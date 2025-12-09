import { Component, OnInit, OnChanges, AfterViewInit, OnDestroy, Input, SimpleChanges, ElementRef, ViewChild, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPencil, faPlus, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';
import { GridStack, GridStackNode, GridStackWidget } from 'gridstack';
import { BoardService } from '../../../core/services/board.service';
import { TabService } from '../../../core/services/tab.service';
import { CardService } from '../../../core/services/card.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DesignModeService } from '../../../core/services/design-mode.service';
import { AddCardModalService } from '../../../core/services/add-card-modal.service';
import { BackgroundSettingsModalService } from '../../../core/services/background-settings-modal.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { DashCardComponent } from '../components/dash-card/dash-card.component';
import { AddCardModalComponent } from '../components/add-card-modal/add-card-modal.component';
import { BackgroundSettingsModalComponent } from '../components/background-settings-modal/background-settings-modal.component';
import type { Board, Tab, Card } from '../../../core/models';

@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, DashCardComponent, AddCardModalComponent, BackgroundSettingsModalComponent, FontAwesomeModule],
  templateUrl: './board-view.component.html',
  styleUrls: ['./board-view.component.scss']
})
export class BoardViewComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private boardService = inject(BoardService);
  private tabService = inject(TabService);
  private cardService = inject(CardService);
  private themeService = inject(ThemeService);

  designMode = inject(DesignModeService);
  addCardModal = inject(AddCardModalService);
  backgroundModal = inject(BackgroundSettingsModalService);

  // Inputs for embedding
  @Input() boardSlug?: string;
  @Input() tabSlug?: string;

  // Gridstack reference
  @ViewChild('gridContainer') gridContainer?: ElementRef<HTMLElement>;
  private grid?: GridStack;

  // FontAwesome Icons
  faArrowLeft = faArrowLeft;
  faPencil = faPencil;
  faPlus = faPlus;
  faSpinner = faSpinner;
  faTimes = faTimes;

  board = signal<Board | null>(null);
  tabs = signal<Tab[]>([]);
  currentTab = signal<Tab | null>(null);
  cards = signal<Card[]>([]);
  loading = signal(true);
  newCardTitle = signal('');
  newCardContent = signal('');

  constructor() {
    // Watch for design mode changes and update grid accordingly
    effect(() => {
      const isDesignMode = this.designMode.isDesignMode();
      console.log('Design mode changed:', isDesignMode);

      // Update grid draggable state when design mode changes
      if (this.grid) {
        this.updateDraggableState();
      }
    });

    // Debug: Log current tab background settings
    effect(() => {
      const tab = this.currentTab();
      if (tab) {
        console.log('Current tab background settings:', {
          id: tab.id,
          name: tab.name,
          backgroundImage: tab.backgroundImage,
          backgroundBlur: tab.backgroundBlur,
          backgroundOpacity: tab.backgroundOpacity
        });
      }
    });
  }

  ngOnInit(): void {
    // If boardSlug is provided as input, use that (embedded mode)
    if (this.boardSlug) {
      this.loadBoard(this.boardSlug, this.tabSlug || 'main');
    } else {
      // Otherwise, get from route params (standalone mode)
      this.route.params.subscribe(params => {
        const boardSlug = params['boardSlug'];
        const tabSlug = params['tabSlug'];
        this.loadBoard(boardSlug, tabSlug);
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload when boardSlug input changes
    if (changes['boardSlug'] && !changes['boardSlug'].firstChange) {
      const slug = changes['boardSlug'].currentValue;
      if (slug) {
        this.loadBoard(slug, this.tabSlug || 'main');
      }
    }
  }

  ngAfterViewInit(): void {
    // Initialize grid after view is ready
    setTimeout(() => {
      if (this.gridContainer && !this.grid) {
        this.initGrid();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroyGrid();
  }

  private initGrid(): void {
    if (!this.gridContainer) {
      console.error('Cannot init GridStack: container not found');
      return;
    }

    console.log('Initializing GridStack...');

    this.grid = GridStack.init({
      cellHeight: 100,
      margin: 16,
      minRow: 1,
      float: true, // Allow cards to move freely, prevents auto-compacting
      acceptWidgets: true,
      animate: true,
      column: 12, // 12 column grid for flexibility
      resizable: {
        handles: 'ne, nw, se, sw', // Only corner handles (southeast, southwest)
        autoHide: true, // Don't auto-hide resize handles
      },
      alwaysShowResizeHandle: true // Always show resize handles (not just on mobile)
    }, this.gridContainer.nativeElement);

    // Load existing widgets from DOM
    const existingItems = this.gridContainer.nativeElement.querySelectorAll('.grid-stack-item');
    console.log('Found existing items:', existingItems.length);

    if (existingItems.length > 0) {
      const widgets = Array.from(existingItems).map((el: Element) => {
        const htmlEl = el as HTMLElement;
        const cardId = htmlEl.getAttribute('data-card-id');
        const x = parseInt(htmlEl.getAttribute('gs-x') || '0');
        const y = parseInt(htmlEl.getAttribute('gs-y') || '0');
        const w = parseInt(htmlEl.getAttribute('gs-w') || '2');
        const h = parseInt(htmlEl.getAttribute('gs-h') || '1');

        console.log(`Loading widget ${cardId}:`, { x, y, w, h });

        return {
          x,
          y,
          w,
          h,
          el: htmlEl,
          noResize: false,
          noMove: false
        };
      });

      this.grid.load(widgets);
      console.log('===== WIDGETS LOADED INTO GRIDSTACK =====');

      // Verify positions after loading
      setTimeout(() => {
        if (!this.gridContainer) return;

        const items = this.gridContainer.nativeElement.querySelectorAll('.grid-stack-item');
        items.forEach((item: Element) => {
          const htmlEl = item as HTMLElement;
          const node = (htmlEl as any).gridstackNode;
          const cardId = htmlEl.getAttribute('data-card-id');
          if (node) {
            console.log(`GridStack position for ${cardId}:`, {
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h
            });
          }
        });
      }, 100);
    }

    // Listen for any position changes
    this.grid.on('change', (event: Event, items: any[]) => {
      console.log('===== GRID CHANGE EVENT =====');
      items?.forEach((item: any) => {
        console.log('Position changed:', {
          id: item.el?.getAttribute('data-card-id'),
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h
        });
      });
    });

    // Listen to drag stop events to save positions
    this.grid.on('dragstop', (event: Event, element: GridStackWidget) => {
      const htmlElement = element as HTMLElement;
      const cardId = htmlElement.getAttribute('data-card-id');
      if (!cardId) return;

      const node = (htmlElement as any).gridstackNode as GridStackNode;
      if (!node) return;

      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const w = node.w ?? 2;
      const h = node.h ?? 1;

      console.log('=== DRAG STOPPED ===');
      console.log('Card ID:', cardId);
      console.log('New position:', { x, y, w, h });
      console.log('Saving to backend...');

      // Update local card data immediately
      this.cards.update(cards =>
        cards.map(c => c.id === cardId
          ? { ...c, layoutX: x, layoutY: y, layoutW: w, layoutH: h }
          : c
        )
      );

      // Save position to backend
      this.cardService.updateCardLayout(cardId, {
        layoutX: x,
        layoutY: y,
        layoutW: w,
        layoutH: h
      }).subscribe({
        next: () => {
          console.log('Card position saved');
        },
        error: (err: any) => {
          console.error('Failed to save position:', err);
        }
      });
    });

    // Listen to resize start for debugging
    this.grid.on('resizestart', (event: Event, element: GridStackWidget) => {
      const htmlElement = element as HTMLElement;
      const cardId = htmlElement.getAttribute('data-card-id');
      console.log('===== RESIZE STARTED =====');
      console.log('Card ID:', cardId);
    });

    // Listen to resize stop events to save sizes
    this.grid.on('resizestop', (event: Event, element: GridStackWidget) => {
      const htmlElement = element as HTMLElement;
      const cardId = htmlElement.getAttribute('data-card-id');
      if (!cardId) return;

      const node = (htmlElement as any).gridstackNode as GridStackNode;
      if (!node) return;

      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const w = node.w ?? 2;
      const h = node.h ?? 1;

      console.log('Card resized:', { cardId, x, y, w, h });

      // Update local card data immediately
      this.cards.update(cards =>
        cards.map(c => c.id === cardId
          ? { ...c, layoutX: x, layoutY: y, layoutW: w, layoutH: h }
          : c
        )
      );

      // Save size to backend
      this.cardService.updateCardLayout(cardId, {
        layoutX: x,
        layoutY: y,
        layoutW: w,
        layoutH: h
      }).subscribe({
        next: () => {
          console.log('Card size saved');
        },
        error: (err: any) => {
          console.error('Failed to save size:', err);
        }
      });
    });

    // Enable dragging based on mode
    this.updateDraggableState();

    console.log('GridStack initialized successfully');
  }

  private destroyGrid(): void {
    if (this.grid) {
      this.grid.destroy();
      this.grid = undefined;
    }
  }

  private applySavedPositions(): void {
    if (!this.grid) return;

    console.log('applySavedPositions - Current cards array:', this.cards().map(c => ({
      id: c.id, x: c.layoutX, y: c.layoutY, w: c.layoutW, h: c.layoutH
    })));

    // GridStack will handle positioning through the widget data attributes
    // This method is kept for logging/debugging purposes
    // Actual positioning happens in the template with gs-x, gs-y, gs-w, gs-h attributes
  }

  private refreshGrid(): void {
    setTimeout(() => {
      if (!this.grid) {
        // Grid doesn't exist, initialize it
        console.log('Grid not initialized, initializing now...');
        this.initGrid();
        return;
      }

      console.log('Refreshing GridStack...');

      // Use batchUpdate for performance when adding multiple widgets
      this.grid.batchUpdate();

      // Find any new items that aren't managed by GridStack yet
      const allElements = this.gridContainer!.nativeElement.querySelectorAll('.grid-stack-item');

      allElements.forEach((el: Element) => {
        const htmlEl = el as HTMLElement;
        const isManaged = (htmlEl as any).gridstackNode !== undefined;

        if (!isManaged) {
          const cardId = htmlEl.getAttribute('data-card-id');
          console.log('Adding new widget for:', cardId);

          // Get widget options from attributes
          const x = parseInt(htmlEl.getAttribute('gs-x') || '0');
          const y = parseInt(htmlEl.getAttribute('gs-y') || '0');
          const w = parseInt(htmlEl.getAttribute('gs-w') || '3');
          const h = parseInt(htmlEl.getAttribute('gs-h') || '2');

          // Use makeWidget (converts existing DOM element to widget)
          this.grid!.makeWidget(htmlEl);

          console.log('Widget added with position:', { cardId, x, y, w, h });
        }
      });

      // End batch update
      this.grid.batchUpdate(false);

      // Update draggable state based on design mode
      this.updateDraggableState();

      console.log('GridStack refresh complete');
    }, 200);
  }

  private updateDraggableState(): void {
    if (!this.grid) {
      console.log('Cannot update draggable state: grid not initialized');
      return;
    }

    const canDrag = this.designMode.isDesignMode();

    console.log('Updating draggable state:', {
      canDrag,
      designMode: this.designMode.isDesignMode(),
      cardCount: this.cards().length
    });

    // Use GridStack's recommended API methods
    // Enable/disable at grid level (affects all widgets unless overridden)
    this.grid.enableMove(canDrag);
    this.grid.enableResize(canDrag);

    console.log(`Grid-level controls set: move=${canDrag}, resize=${canDrag}`);
  }


  loadBoard(boardSlug: string, tabSlug: string): void {
    this.loading.set(true);

    this.boardService.getBoards().subscribe({
      next: (boards) => {
        const board = boards.find(b => b.slug === boardSlug);
        if (!board) {
          this.router.navigate(['/boards']);
          return;
        }

        this.board.set(board);

        // Load theme if board has one
        if (board.themeId) {
          this.themeService.getTheme(board.themeId).subscribe({
            next: (theme) => this.themeService.applyTheme(theme)
          });
        }

        // Load tabs
        this.loadTabs(board.id, tabSlug);
      },
      error: (err) => {
        console.error('Failed to load board:', err);
        this.loading.set(false);
      }
    });
  }

  loadTabs(boardId: string, tabSlug: string): void {
    this.tabService.getTabsByBoard(boardId).subscribe({
      next: (tabs) => {
        this.tabs.set(tabs);
        const tab = tabs.find(t => t.slug === tabSlug) || tabs[0];
        if (tab) {
          this.currentTab.set(tab);
          this.loadCards(tab.id);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tabs:', err);
        this.loading.set(false);
      }
    });
  }

  loadCards(tabId: string): void {
    console.log('Loading cards for tab:', tabId);

    // Destroy existing grid before loading new cards
    if (this.grid) {
      console.log('Destroying existing grid before loading new cards');
      this.destroyGrid();
    }

    this.tabService.getTab(tabId).subscribe({
      next: (tab) => {
        console.log('Tab data received:', tab);
        console.log('Tab zones:', tab.zones);

        // Update currentTab with full data including zones
        this.currentTab.set(tab);

        // Flatten all cards from all zones
        const allCards = tab.zones?.flatMap(zone => {
          console.log('Zone:', zone.id, 'Cards:', zone.cards?.length || 0);
          return zone.cards || [];
        }) || [];

        console.log('===== CARDS LOADED FROM BACKEND =====');
        console.log('Total cards loaded:', allCards.length);
        allCards.forEach(c => {
          console.log(`Card "${c.title}" (${c.id}):`, {
            layoutX: c.layoutX,
            layoutY: c.layoutY,
            layoutW: c.layoutW,
            layoutH: c.layoutH
          });
        });

        // Sort cards by layoutY to maintain order
        allCards.sort((a, b) => (a.layoutY || 0) - (b.layoutY || 0));

        this.cards.set(allCards);
        this.refreshGrid();
      },
      error: (err) => {
        console.error('Failed to load cards:', err);
      }
    });
  }

  switchTab(tab: Tab): void {
    const board = this.board();
    if (!board) return;

    this.router.navigate(['/boards', board.slug, tab.slug]);
  }

  toggleDesignMode(): void {
    this.designMode.toggle();
    console.log('Design mode toggled:', this.designMode.isDesignMode());
    this.updateDraggableState();
  }

  goBack(): void {
    this.router.navigate(['/boards']);
  }

  addCard(): void {
    const tab = this.currentTab();
    if (!tab || !this.newCardTitle()) {
      return;
    }

    // Find the first zone in the current tab, or use the tab ID as zone
    const zoneId = tab.zones?.[0]?.id || tab.id;

    console.log('Creating card with zoneId:', zoneId);
    console.log('Tab zones:', tab.zones);

    // Find next available position for new card
    // Use grid positions (not pixels): x is column (0-11), y is row
    let nextY = 0;
    if (this.cards().length > 0) {
      // Place new card below the lowest card
      nextY = Math.max(...this.cards().map(c => (c.layoutY || 0) + (c.layoutH || 1)));
    }

    const cardData = {
      zoneId,
      title: this.newCardTitle(),
      subtitle: this.newCardContent() || undefined,
      layoutX: 0, // Start at column 0
      layoutY: nextY, // Place below existing cards
      layoutW: 3, // 3 columns wide (out of 12)
      layoutH: 2, // 2 rows tall
      layoutLocked: false
    };

    console.log('Creating card with data:', cardData);

    this.cardService.createCard(cardData).subscribe({
      next: (card) => {
        console.log('Card created successfully:', card);
        this.cards.update(cards => [...cards, card]);
        this.addCardModal.close();
        this.newCardTitle.set('');
        this.newCardContent.set('');
        this.refreshGrid();
      },
      error: (err) => {
        console.error('Failed to create card:', err);
        alert('Failed to create card: ' + (err.message || 'Unknown error'));
      }
    });
  }

  handleCardCreated(cardData: {
    title: string;
    subtitle?: string;
    url?: string;
    iconSource: 'catalog' | 'custom';
    iconCatalogId?: string;
    iconCustomUrl?: string;
  }): void {
    const tab = this.currentTab();
    if (!tab) {
      return;
    }

    // Find the first zone in the current tab
    const zoneId = tab.zones?.[0]?.id || tab.id;

    // Find next available position for new card
    let nextY = 0;
    if (this.cards().length > 0) {
      nextY = Math.max(...this.cards().map(c => (c.layoutY || 0) + (c.layoutH || 1)));
    }

    const newCard = {
      zoneId,
      title: cardData.title,
      subtitle: cardData.subtitle,
      iconSource: cardData.iconSource,
      iconCatalogId: cardData.iconCatalogId,
      iconCustomUrl: cardData.iconCustomUrl,
      layoutX: 0,
      layoutY: nextY,
      layoutW: 3,
      layoutH: 2,
      layoutLocked: false,
      // Store URL in meta for now (can be used for click handling later)
      meta: cardData.url ? { url: cardData.url } : undefined
    };

    console.log('Creating card with icon data:', newCard);

    this.cardService.createCard(newCard).subscribe({
      next: (card) => {
        console.log('Card created successfully:', card);
        this.cards.update(cards => [...cards, card]);
        this.addCardModal.close();
        this.refreshGrid();
      },
      error: (err) => {
        console.error('Failed to create card:', err);
        alert('Failed to create card: ' + (err.message || 'Unknown error'));
      }
    });
  }

  onCardDeleted(cardId: string): void {
    console.log('Deleting card:', cardId);

    // Remove from cards array first
    this.cards.update(cards => cards.filter(c => c.id !== cardId));

    if (this.grid && this.gridContainer) {
      // Find and remove the widget from GridStack
      const element = this.gridContainer.nativeElement.querySelector(`[data-card-id="${cardId}"]`);
      if (element) {
        this.grid.removeWidget(element as HTMLElement);
        console.log('Card removed from GridStack');
      }
    }
  }

  handleBackgroundSettingsSaved(event: { tabIds: string[], settings: Partial<Tab> }): void {
    console.log('Saving background settings:', event);

    const { tabIds, settings } = event;
    const currentTabId = this.currentTab()?.id;
    let updatesCompleted = 0;

    // Update each tab
    tabIds.forEach(tabId => {
      this.tabService.updateTab(tabId, settings).subscribe({
        next: (updatedTab) => {
          console.log('Tab background updated:', updatedTab);

          // Update the tabs array
          this.tabs.update(tabs =>
            tabs.map(t => t.id === tabId ? { ...t, ...settings } : t)
          );

          updatesCompleted++;

          // If all updates are complete and current tab was updated, reload it
          if (updatesCompleted === tabIds.length) {
            if (currentTabId && tabIds.includes(currentTabId)) {
              // Reload the current tab to get fresh data with background settings
              this.loadCards(currentTabId);
            }
            this.backgroundModal.close();
          }
        },
        error: (err) => {
          console.error('Failed to update tab background:', err);
          alert('Failed to update background settings: ' + (err.message || 'Unknown error'));
        }
      });
    });
  }
}
