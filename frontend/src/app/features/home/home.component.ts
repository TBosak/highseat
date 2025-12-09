import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCog, faPlus, faSpinner, faPalette, faRightFromBracket, faBars, faPencil, faImage } from '@fortawesome/free-solid-svg-icons';
import { BoardService } from '../../core/services/board.service';
import { AuthService } from '../../core/services/auth.service';
import { DesignModeService } from '../../core/services/design-mode.service';
import { AddCardModalService } from '../../core/services/add-card-modal.service';
import { BackgroundSettingsModalService } from '../../core/services/background-settings-modal.service';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { BoardViewComponent } from '../dashboard/board-view/board-view.component';
import type { Board } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, HasPermissionDirective, BoardViewComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private boardService = inject(BoardService);
  private authService = inject(AuthService);
  private router = inject(Router);
  designMode = inject(DesignModeService);
  addCardModal = inject(AddCardModalService);
  backgroundModal = inject(BackgroundSettingsModalService);

  // Icons
  faCog = faCog;
  faPlus = faPlus;
  faSpinner = faSpinner;
  faPalette = faPalette;
  faRightFromBracket = faRightFromBracket;
  faBars = faBars;
  faPencil = faPencil;
  faImage = faImage;

  boards = signal<Board[]>([]);
  selectedBoardSlug = signal<string | null>(null);
  loading = signal(true);
  user = this.authService.user;
  showMenu = signal(false);

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
}
