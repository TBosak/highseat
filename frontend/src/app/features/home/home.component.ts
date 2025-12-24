import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCog, faPlus, faSpinner, faPalette, faRightFromBracket, faBars, faPencil, faImage, faNetworkWired, faHome, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { BoardService } from '../../core/services/board.service';
import { AuthService } from '../../core/services/auth.service';
import { CardService } from '../../core/services/card.service';
import { DesignModeService } from '../../core/services/design-mode.service';
import { AddCardModalService } from '../../core/services/add-card-modal.service';
import { BackgroundSettingsModalService } from '../../core/services/background-settings-modal.service';
import { ServiceDiscoveryModalService } from '../../core/services/service-discovery-modal.service';
import { IconPickerModalService } from '../../core/services/icon-picker-modal.service';
import { IconCatalogService } from '../../core/services/icon-catalog.service';
import { ThemeService } from '../../core/services/theme.service';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { BoardViewComponent } from '../dashboard/board-view/board-view.component';
import { ServiceDiscoveryModalComponent, type DiscoveredService } from '../dashboard/components/service-discovery-modal/service-discovery-modal.component';
import { IconPickerModalComponent } from '../../shared/components/icon-picker-modal/icon-picker-modal.component';
import type { Board } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, HasPermissionDirective, BoardViewComponent, ServiceDiscoveryModalComponent, IconPickerModalComponent, CdkDrag, CdkDropList],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private boardService = inject(BoardService);
  private authService = inject(AuthService);
  private cardService = inject(CardService);
  private iconCatalog = inject(IconCatalogService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  designMode = inject(DesignModeService);
  addCardModal = inject(AddCardModalService);
  backgroundModal = inject(BackgroundSettingsModalService);
  serviceDiscoveryModal = inject(ServiceDiscoveryModalService);
  iconPickerModal = inject(IconPickerModalService);

  // Icons
  faCog = faCog;
  faPlus = faPlus;
  faSpinner = faSpinner;
  faPalette = faPalette;
  faRightFromBracket = faRightFromBracket;
  faBars = faBars;
  faPencil = faPencil;
  faImage = faImage;
  faNetworkWired = faNetworkWired;
  faHome = faHome;

  boards = signal<Board[]>([]);
  selectedBoardSlug = signal<string | null>(null);
  loading = signal(true);
  user = this.authService.user;
  showMenu = signal(false);
  showAddMenu = signal(false);

  selectedBoard = computed(() => {
    const slug = this.selectedBoardSlug();
    if (!slug) return null;
    return this.boards().find(b => b.slug === slug) || null;
  });

  ngOnInit(): void {
    this.loadBoards();
  }

  loadBoards(): void {
    this.loading.set(true);
    this.boardService.getBoards().subscribe({
      next: (boards) => {
        this.boards.set(boards);
        // Select first board by default
        if (boards.length > 0 && !this.selectedBoardSlug()) {
          this.selectedBoardSlug.set(boards[0].slug);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load boards:', err);
        this.loading.set(false);
      }
    });
  }

  selectBoard(board: Board): void {
    this.selectedBoardSlug.set(board.slug);
  }

  openSettings(): void {
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  toggleMenu(): void {
    this.showMenu.update(v => !v);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  navigateToThemes(): void {
    this.closeMenu();
    this.router.navigate(['/themes']);
  }

  openSettingsFromMenu(): void {
    this.closeMenu();
    this.openSettings();
  }

  toggleDesignMode(): void {
    this.closeMenu();
    this.designMode.toggle();
  }

  openAddCardModal(): void {
    this.closeMenu();
    this.addCardModal.open();
  }

  openBackgroundSettings(): void {
    this.closeMenu();
    this.backgroundModal.open();
  }

  toggleAddMenu(): void {
    this.showAddMenu.update(v => !v);
  }

  closeAddMenu(): void {
    this.showAddMenu.set(false);
  }

  openAddCardFromMenu(): void {
    this.closeAddMenu();
    this.addCardModal.open();
  }

  openServiceDiscovery(): void {
    this.closeAddMenu();
    this.serviceDiscoveryModal.open();
  }

  handleServicesDiscovered(services: DiscoveredService[]): void {
    const board = this.selectedBoard();
    if (!board) {
      alert('No board selected');
      this.serviceDiscoveryModal.close();
      return;
    }

    // Fetch the full board data with tabs and zones
    this.boardService.getBoard(board.id).subscribe({
      next: (fullBoard) => {
        if (!fullBoard.tabs || fullBoard.tabs.length === 0) {
          alert('No tabs available to add cards to');
          this.serviceDiscoveryModal.close();
          return;
        }

        // Get the first zone of the first tab
        const firstTab = fullBoard.tabs[0];
        if (!firstTab.zones || firstTab.zones.length === 0) {
          alert('No zones available to add cards to');
          this.serviceDiscoveryModal.close();
          return;
        }

        const zoneId = firstTab.zones[0].id;

        // Load icon catalog first to ensure icons are available
        this.iconCatalog.getAllIcons().subscribe({
          next: () => {
            // Create cards for all selected services
            let completed = 0;
            let failed = 0;

            services.forEach((service, index) => {
              const cardData: any = {
                zoneId,
                title: service.suggestedTitle,
                subtitle: service.containerName || undefined,
                iconSource: service.iconId ? 'catalog' : 'custom',
                iconCatalogId: service.iconId,
                layoutX: 0,
                layoutY: index * 2,
                layoutW: 2,
                layoutH: 2
              };

              // Set icon URL if using catalog icon
              if (service.iconId) {
                const themeVariant = this.themeService.themeVariant();
                const iconUrl = this.iconCatalog.getIconForThemeVariant(service.iconId, themeVariant);
                if (iconUrl) {
                  cardData.iconCustomUrl = iconUrl;
                } else {
                  console.warn(`No icon URL found for iconId: ${service.iconId}`);
                }
              } else {
                console.warn(`Service has no iconId: ${service.name}`);
              }

              // Store URL in meta field
              if (service.suggestedUrl) {
                cardData.meta = { url: service.suggestedUrl };
              }

              this.cardService.createCard(cardData).subscribe({
                next: () => {
                  completed++;
                  if (completed + failed === services.length) {
                    this.finishBulkAdd(completed, failed);
                  }
                },
                error: (err) => {
                  console.error('Failed to create card:', err);
                  failed++;
                  if (completed + failed === services.length) {
                    this.finishBulkAdd(completed, failed);
                  }
                }
              });
            });
          },
          error: (err) => {
            console.error('Failed to load icon catalog:', err);
            alert('Failed to load icon catalog');
            this.serviceDiscoveryModal.close();
          }
        });
      },
      error: (err) => {
        console.error('Failed to load board details:', err);
        alert('Failed to load board information');
        this.serviceDiscoveryModal.close();
      }
    });
  }

  private finishBulkAdd(completed: number, failed: number): void {
    this.serviceDiscoveryModal.close();
    this.loadBoards(); // Reload to show new cards

    if (failed > 0) {
      alert(`Added ${completed} card(s). ${failed} failed.`);
    }
  }

  onBoardTabDrop(event: CdkDragDrop<Board[]>): void {
    const boardsArray = this.boards();

    // Move the item in the local array
    moveItemInArray(boardsArray, event.previousIndex, event.currentIndex);

    // Update the boards signal
    this.boards.set([...boardsArray]);

    // Get the new order of board IDs
    const boardIds = boardsArray.map(b => b.id);

    // Send the new order to the backend
    this.boardService.reorderBoards(boardIds).subscribe({
      next: (updatedBoards) => {
        this.boards.set(updatedBoards);
      },
      error: (err) => {
        console.error('Failed to reorder boards:', err);
        // Reload boards to revert to server state on error
        this.loadBoards();
      }
    });
  }

  isHomeBoard(board: Board): boolean {
    return board.order === 0;
  }

  onBoardTabRightClick(event: MouseEvent, board: Board): void {
    event.preventDefault(); // Prevent default context menu
    this.iconPickerModal.open(board.id);
  }

  handleIconSelected(iconName: string): void {
    const boardId = this.iconPickerModal.boardId();
    if (!boardId) return;

    this.boardService.updateBoard(boardId, { icon: iconName }).subscribe({
      next: (updatedBoard) => {
        // Update the board in the list
        const boards = this.boards();
        const index = boards.findIndex(b => b.id === boardId);
        if (index !== -1) {
          boards[index] = updatedBoard;
          this.boards.set([...boards]);
        }
        this.iconPickerModal.close();
      },
      error: (err) => {
        console.error('Failed to update board icon:', err);
        alert('Failed to update board icon');
      }
    });
  }

  getIconForBoard(board: Board): IconDefinition | null {
    if (!board.icon) return null;

    // Dynamically get the icon from FontAwesome
    try {
      const icon = (solidIcons as any)[board.icon];
      return icon || null;
    } catch {
      return null;
    }
  }
}
