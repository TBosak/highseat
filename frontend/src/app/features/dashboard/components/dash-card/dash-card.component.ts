import { Component, Input, Output, EventEmitter, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPencil, faTrash, faEllipsis, faSpinner, faCheck } from '@fortawesome/free-solid-svg-icons';
import { CardService } from '../../../../core/services/card.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { IconCatalogService } from '../../../../core/services/icon-catalog.service';
import { AddCardModalService } from '../../../../core/services/add-card-modal.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { NoteWidgetComponent } from '../../../widgets/note-widget/note-widget.component';
import { SystemMetricsWidgetComponent } from '../../../widgets/system-metrics-widget/system-metrics-widget.component';
import { SystemProcessesWidgetComponent } from '../../../widgets/system-processes-widget/system-processes-widget.component';
import { SystemNetworkWidgetComponent } from '../../../widgets/system-network-widget/system-network-widget.component';
import { PlexWidgetComponent } from '../../../widgets/plex-widget/plex-widget.component';
import { JellyfinWidgetComponent } from '../../../widgets/jellyfin-widget/jellyfin-widget.component';
import { ClockWidgetComponent } from '../../../widgets/clock-widget/clock-widget.component';
import type { Card, CardStyle, CardWidget, NoteWidgetConfig, SystemMetricsWidgetConfig, SystemProcessesWidgetConfig, SystemNetworkWidgetConfig, PlexWidgetConfig, JellyfinWidgetConfig, ClockWidgetConfig } from '../../../../core/models';

@Component({
  selector: 'app-dash-card',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, FontAwesomeModule, NoteWidgetComponent, SystemMetricsWidgetComponent, SystemProcessesWidgetComponent, SystemNetworkWidgetComponent, PlexWidgetComponent, JellyfinWidgetComponent, ClockWidgetComponent],
  templateUrl: './dash-card.component.html',
  styleUrls: ['./dash-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashCardComponent {
  private cardService = inject(CardService);
  private themeService = inject(ThemeService);
  private iconCatalog = inject(IconCatalogService);
  private addCardModal = inject(AddCardModalService);

  // FontAwesome Icons
  faPencil = faPencil;
  faTrash = faTrash;
  faEllipsis = faEllipsis;
  faSpinner = faSpinner;
  faCheck = faCheck;

  // Save state for note widgets
  noteSaveState = signal<'idle' | 'editing' | 'saving' | 'saved'>('idle');

  @Input({ required: true }) card!: Card;
  @Input() designMode = false;

  @Output() cardDeleted = new EventEmitter<string>();

  // Computed signal for theme-aware icon URL
  iconUrl = computed(() => {
    // If the card uses a catalog icon and has a catalog ID
    if (this.card.iconSource === 'catalog' && this.card.iconCatalogId) {
      const themeVariant = this.themeService.themeVariant();
      const variantUrl = this.iconCatalog.getIconForThemeVariant(this.card.iconCatalogId, themeVariant);
      if (variantUrl) {
        return variantUrl;
      }
    }

    // Fall back to custom URL or undefined
    return this.card.iconCustomUrl || undefined;
  });

  getCardStyle(): CardStyle {
    if (!this.card.style) return {};
    return typeof this.card.style === 'string'
      ? JSON.parse(this.card.style)
      : this.card.style;
  }

  editCard(): void {
    this.addCardModal.openForEdit(this.card);
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
    // Don't navigate if in design mode or if card has widgets
    if (this.designMode || this.hasWidgets()) {
      return;
    }

    const url = this.getCardUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  hasWidgets(): boolean {
    return !!(this.card.widgets && this.card.widgets.length > 0);
  }

  getNoteWidget(): CardWidget | undefined {
    return this.card.widgets?.find(w => w.type === 'note');
  }

  getNoteWidgetConfig(config: Record<string, any>): NoteWidgetConfig {
    return config as NoteWidgetConfig;
  }

  onNoteWidgetSave(config: NoteWidgetConfig): void {
    // Update the card's widget configuration
    const updatedWidgets = this.card.widgets?.map(w =>
      w.type === 'note' ? { ...w, config } : w
    ) || [];

    // Update local card immediately for optimistic UI
    this.card = { ...this.card, widgets: updatedWidgets };

    // Save to backend - only send allowed fields
    this.cardService.updateCard(this.card.id, {
      widgets: updatedWidgets
    }).subscribe({
      next: () => {
        console.log('Note saved successfully');
      },
      error: (err) => {
        console.error('Failed to save note:', err);
        alert('Failed to save note. Please try again.');
      }
    });
  }

  onNoteSaveStateChange(state: 'idle' | 'editing' | 'saving' | 'saved'): void {
    this.noteSaveState.set(state);
  }

  getSystemMetricsConfig(config: Record<string, any>): SystemMetricsWidgetConfig {
    return config as SystemMetricsWidgetConfig;
  }

  getSystemProcessesConfig(config: Record<string, any>): SystemProcessesWidgetConfig {
    return config as SystemProcessesWidgetConfig;
  }

  getSystemNetworkConfig(config: Record<string, any>): SystemNetworkWidgetConfig {
    return config as SystemNetworkWidgetConfig;
  }

  getPlexConfig(config: Record<string, any>): PlexWidgetConfig {
    return config as PlexWidgetConfig;
  }

  getJellyfinConfig(config: Record<string, any>): JellyfinWidgetConfig {
    return config as JellyfinWidgetConfig;
  }

  getClockConfig(config: Record<string, any>): ClockWidgetConfig {
    return config as ClockWidgetConfig;
  }
}
