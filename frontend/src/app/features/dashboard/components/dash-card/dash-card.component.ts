import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPalette, faTrash } from '@fortawesome/free-solid-svg-icons';
import { CardService } from '../../../../core/services/card.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import type { Card, CardStyle } from '../../../../core/models';

@Component({
  selector: 'app-dash-card',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, FontAwesomeModule],
  templateUrl: './dash-card.component.html',
  styleUrls: ['./dash-card.component.scss']
})
export class DashCardComponent {
  private cardService = inject(CardService);

  // FontAwesome Icons
  faPalette = faPalette;
  faTrash = faTrash;

  @Input({ required: true }) card!: Card;
  @Input() designMode = false;

  @Output() cardDeleted = new EventEmitter<string>();

  showStyleEditor = signal(false);
  borderRadius = signal(16);

  ngOnInit(): void {
    const style = this.getCardStyle();
    if (style.borderRadius !== undefined) {
      this.borderRadius.set(style.borderRadius);
    }
  }

  getCardStyle(): CardStyle {
    if (!this.card.style) return {};
    return typeof this.card.style === 'string'
      ? JSON.parse(this.card.style)
      : this.card.style;
  }

  updateBorderRadius(value: number): void {
    this.borderRadius.set(value);
    this.updateStyle({ borderRadius: value });
  }

  updateStyle(partialStyle: Partial<CardStyle>): void {
    const currentStyle = this.getCardStyle();
    const newStyle = { ...currentStyle, ...partialStyle };

    this.cardService.updateCardStyle(this.card.id, newStyle).subscribe({
      next: (updatedCard) => {
        this.card.style = updatedCard.style;
      }
    });
  }

  deleteCard(): void {
    if (!confirm(`Delete "${this.card.title}"?`)) return;

    this.cardService.deleteCard(this.card.id).subscribe({
      next: () => {
        this.cardDeleted.emit(this.card.id);
      },
      error: (err) => {
        console.error('Failed to delete card:', err);
        alert('Failed to delete card. Please try again.');
      }
    });
  }

  getCardClasses(): string[] {
    const classes = ['dash-card', 'card'];
    if (this.designMode) classes.push('design-mode');
    return classes;
  }

  getCardStyles(): Record<string, string> {
    const style = this.getCardStyle();
    const styles: Record<string, string> = {};

    if (style.borderRadius !== undefined) {
      styles['border-radius'] = `${style.borderRadius}px`;
    }

    if (style.backgroundToken) {
      styles['background'] = `var(--${style.backgroundToken})`;
    }

    if (style.borderColorToken) {
      styles['border-color'] = `var(--${style.borderColorToken})`;
    }

    if (style.borderWidth !== undefined) {
      styles['border-width'] = `${style.borderWidth}px`;
    }

    // Add cursor pointer if card has a URL
    if (this.getCardUrl() && !this.designMode) {
      styles['cursor'] = 'pointer';
    }

    return styles;
  }

  getCardUrl(): string | null {
    if (!this.card.meta) return null;

    try {
      const meta = typeof this.card.meta === 'string'
        ? JSON.parse(this.card.meta)
        : this.card.meta;
      return meta?.url || null;
    } catch {
      return null;
    }
  }

  handleCardClick(): void {
    // Don't navigate if in design mode
    if (this.designMode) {
      return;
    }

    const url = this.getCardUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }
}
