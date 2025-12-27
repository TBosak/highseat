import { Component, Input, Output, EventEmitter, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes, faSave, faUndo, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { CssEditorComponent } from '../css-editor/css-editor.component';
import { BoardService } from '../../../core/services/board.service';
import { CustomCssService } from '../../../core/services/custom-css.service';
import type { Board } from '../../../core/models';

@Component({
  selector: 'app-board-settings-modal',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, CssEditorComponent],
  templateUrl: './board-settings-modal.component.html',
  styleUrls: ['./board-settings-modal.component.scss']
})
export class BoardSettingsModalComponent implements OnInit {
  @Input() board!: Board;
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<Board>();

  private boardService = inject(BoardService);
  private customCssService = inject(CustomCssService);

  faTimes = faTimes;
  faSave = faSave;
  faUndo = faUndo;

  // Icon selection
  selectedIcon = signal<string | null>(null);
  iconSearchQuery = signal<string>('');
  allIcons: { name: string; icon: IconDefinition }[] = [];

  // CSS editor
  customCss = signal<string>('');
  cssLoading = signal(false);

  cssExamples = [
    `/* Glassmorphic effect */\n.dash-card {\n  background: rgba(255, 255, 255, 0.08) !important;\n  backdrop-filter: blur(12px) saturate(180%);\n  border: 1px solid rgba(255, 255, 255, 0.18);\n  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);\n}`,
    `/* Accent border */\n.dash-card {\n  border-left: 5px solid var(--accent) !important;\n  box-shadow: -5px 0 15px rgba(var(--accent), 0.3);\n}`,
    `/* Floating cards */\n.dash-card {\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3),\n              0 1px 8px rgba(0, 0, 0, 0.2);\n}\n\n.dash-card:hover {\n  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4),\n              0 5px 15px rgba(0, 0, 0, 0.3);\n  transform: translateY(-8px);\n}`,
    `/* Tighter layout */\n.zone {\n  gap: 0.75rem !important;\n}`
  ];

  ngOnInit(): void {
    this.selectedIcon.set(this.board.icon || null);
    this.customCss.set(this.board.customCss || '');
    this.loadIcons();
  }

  loadIcons(): void {
    this.allIcons = Object.entries(solidIcons)
      .filter(([name, value]) => name.startsWith('fa') && typeof value === 'object')
      .map(([name, icon]) => ({
        name: this.formatIconName(name),
        icon: icon as IconDefinition
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  formatIconName(name: string): string {
    return name.replace(/^fa/, '').replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);
  }

  get filteredIcons() {
    const query = this.iconSearchQuery().toLowerCase();
    if (!query) return this.allIcons.slice(0, 50);
    return this.allIcons.filter(i => i.name.includes(query)).slice(0, 50);
  }

  selectIcon(iconName: string): void {
    this.selectedIcon.set(iconName);
  }

  onCssChange(css: string): void {
    this.customCss.set(css);
  }

  save(): void {
    this.cssLoading.set(true);

    const updates: any = {};
    if (this.selectedIcon() !== this.board.icon) {
      updates.icon = this.selectedIcon();
    }
    if (this.customCss() !== this.board.customCss) {
      updates.customCss = this.customCss() || null;
    }

    if (Object.keys(updates).length === 0) {
      this.close();
      return;
    }

    this.boardService.updateBoard(this.board.id, updates).subscribe({
      next: (updatedBoard) => {
        // Apply CSS immediately
        if (updates.customCss !== undefined) {
          this.customCssService.injectBoardCss(updatedBoard.id, updates.customCss || '');
        }

        this.cssLoading.set(false);
        this.updated.emit(updatedBoard);
        this.close();
      },
      error: (err) => {
        console.error('Failed to update board:', err);
        this.cssLoading.set(false);
        alert('Failed to save board settings');
      }
    });
  }

  resetCss(): void {
    if (!confirm('Reset custom CSS for this board? This will remove all board-specific styling.')) {
      return;
    }
    this.customCss.set('');
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
