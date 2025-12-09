import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrash, faLock, faRightFromBracket, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { BoardService } from '../../../core/services/board.service';
import { AuthService } from '../../../core/services/auth.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import type { Board } from '../../../core/models';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, FontAwesomeModule],
  templateUrl: './board-list.component.html',
  styleUrls: ['./board-list.component.scss']
})
export class BoardListComponent implements OnInit {
  private boardService = inject(BoardService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // FontAwesome Icons
  faPlus = faPlus;
  faTrash = faTrash;
  faLock = faLock;
  faRightFromBracket = faRightFromBracket;
  faSpinner = faSpinner;

  boards = signal<Board[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  newBoardName = signal('');
  newBoardSlug = signal('');
  user = this.authService.user;

  ngOnInit(): void {
    this.loadBoards();
  }

  loadBoards(): void {
    this.loading.set(true);
    this.boardService.getBoards().subscribe({
      next: (boards) => {
        this.boards.set(boards);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load boards:', err);
        this.loading.set(false);
      }
    });
  }

  openBoard(board: Board): void {
    // Navigate to first tab or default 'main' tab
    this.router.navigate(['/boards', board.slug, 'main']);
  }

  createBoard(): void {
    if (!this.newBoardName() || !this.newBoardSlug()) {
      return;
    }

    this.boardService.createBoard({
      name: this.newBoardName(),
      slug: this.newBoardSlug()
    }).subscribe({
      next: (board) => {
        this.boards.update(boards => [...boards, board]);
        this.showCreateModal.set(false);
        this.newBoardName.set('');
        this.newBoardSlug.set('');
        this.openBoard(board);
      },
      error: (err) => {
        console.error('Failed to create board:', err);
      }
    });
  }

  deleteBoard(board: Board, event: Event): void {
    event.stopPropagation();

    if (!confirm(`Delete board "${board.name}"?`)) {
      return;
    }

    this.boardService.deleteBoard(board.id).subscribe({
      next: () => {
        this.boards.update(boards => boards.filter(b => b.id !== board.id));
      },
      error: (err) => {
        console.error('Failed to delete board:', err);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  generateSlug(): void {
    const slug = this.newBoardName()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.newBoardSlug.set(slug);
  }
}
