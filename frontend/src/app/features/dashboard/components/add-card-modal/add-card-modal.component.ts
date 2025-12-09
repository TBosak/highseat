import { Component, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faTimes, faLink, faImage } from '@fortawesome/free-solid-svg-icons';
import { IconCatalogService, IconCatalogEntry, IconCategory } from '../../../../core/services/icon-catalog.service';

@Component({
  selector: 'app-add-card-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './add-card-modal.component.html',
  styleUrls: ['./add-card-modal.component.scss']
})
export class AddCardModalComponent implements OnInit {
  private iconCatalog = inject(IconCatalogService);

  @Output() cardCreated = new EventEmitter<{
    title: string;
    subtitle?: string;
    url?: string;
    iconSource: 'catalog' | 'custom';
    iconCatalogId?: string;
    iconCustomUrl?: string;
  }>();

  @Output() cancelled = new EventEmitter<void>();

  // Icons
  faSearch = faSearch;
  faTimes = faTimes;
  faLink = faLink;
  faImage = faImage;

  // Form fields
  title = signal('');
  subtitle = signal('');
  url = signal('');

  // Icon selection
  iconSource = signal<'catalog' | 'custom'>('catalog');
  selectedIconId = signal<string | null>(null);
  customIconUrl = signal('');
  iconSearchQuery = signal('');

  // Icon catalog
  categories = signal<IconCategory[]>([]);
  selectedCategory = signal<string | null>(null);
  filteredIcons = signal<IconCatalogEntry[]>([]);

  ngOnInit(): void {
    this.iconCatalog.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);

        // Default to first category
        if (cats.length > 0) {
          this.selectedCategory.set(cats[0].id);
          this.filteredIcons.set(cats[0].icons);
        }
      }
    });
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    const category = this.categories().find(c => c.id === categoryId);
    if (category) {
      this.filteredIcons.set(category.icons);
    }
    this.iconSearchQuery.set('');
  }

  searchIcons(query: string): void {
    this.iconSearchQuery.set(query);

    if (!query.trim()) {
      // Reset to selected category
      const category = this.categories().find(c => c.id === this.selectedCategory());
      if (category) {
        this.filteredIcons.set(category.icons);
      }
    } else {
      // Search across all icons
      this.iconCatalog.searchIcons(query).subscribe({
        next: (results) => {
          this.filteredIcons.set(results);
        }
      });
    }
  }

  selectIcon(iconId: string): void {
    this.selectedIconId.set(iconId);
    this.iconSource.set('catalog');
  }

  setCustomIcon(): void {
    this.iconSource.set('custom');
    this.selectedIconId.set(null);
  }

  getSelectedIcon(): IconCatalogEntry | undefined {
    const id = this.selectedIconId();
    return id ? this.iconCatalog.getIconById(id) : undefined;
  }

  handleSubmit(): void {
    if (!this.title().trim()) {
      alert('Please enter a title');
      return;
    }

    const cardData: any = {
      title: this.title(),
      subtitle: this.subtitle() || undefined,
      url: this.url() || undefined,
      iconSource: this.iconSource()
    };

    if (this.iconSource() === 'catalog' && this.selectedIconId()) {
      cardData.iconCatalogId = this.selectedIconId();
      const icon = this.getSelectedIcon();
      if (icon) {
        cardData.iconCustomUrl = icon.iconUrl;
      }
    } else if (this.iconSource() === 'custom' && this.customIconUrl()) {
      cardData.iconCustomUrl = this.customIconUrl();
    }

    this.cardCreated.emit(cardData);
  }

  handleCancel(): void {
    this.cancelled.emit();
  }
}
