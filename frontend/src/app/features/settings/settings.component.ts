import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faPlus, faTrash, faEdit, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { BoardService } from '../../core/services/board.service';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import type { Board } from '../../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, HasPermissionDirective],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  private boardService = inject(BoardService);
  private router = inject(Router);

  // Icons
  faArrowLeft = faArrowLeft;
  faPlus = faPlus;
  faTrash = faTrash;
  faEdit = faEdit;
  faSpinner = faSpinner;

  boards = signal<Board[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  editingBoard = signal<Board | null>(null);

  newBoardName = signal('');
  newBoardSlug = signal('');

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
      },
      error: (err) => {
        console.error('Failed to create board:', err);
      }
    });
  }

  startEditBoard(board: Board): void {
    this.editingBoard.set(board);
    this.newBoardName.set(board.name);
    this.newBoardSlug.set(board.slug);
    this.showEditModal.set(true);
  }

  updateBoard(): void {
    const board = this.editingBoard();
    if (!board || !this.newBoardName() || !this.newBoardSlug()) {
      return;
    }

    this.boardService.updateBoard(board.id, {
      name: this.newBoardName(),
      slug: this.newBoardSlug()
    }).subscribe({
      next: (updatedBoard) => {
        this.boards.update(boards =>
          boards.map(b => (b.id === updatedBoard.id ? updatedBoard : b))
        );
        this.showEditModal.set(false);
        this.editingBoard.set(null);
        this.newBoardName.set('');
        this.newBoardSlug.set('');
      },
      error: (err) => {
        console.error('Failed to update board:', err);
      }
    });
  }

  deleteBoard(board: Board, event: Event): void {
    event.stopPropagation();

    if (!confirm(`Delete board "${board.name}"? This will also delete all tabs and cards.`)) {
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

  generateSlug(): void {
    const slug = this.newBoardName()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.newBoardSlug.set(slug);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
