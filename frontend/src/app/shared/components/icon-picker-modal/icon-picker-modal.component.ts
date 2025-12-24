import { Component, OnInit, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTimes, faSearch, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-icon-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './icon-picker-modal.component.html',
  styleUrls: ['./icon-picker-modal.component.scss']
})
export class IconPickerModalComponent implements OnInit {
  @Output() iconSelected = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  faTimes = faTimes;
  faSearch = faSearch;

  searchQuery = signal('');
  allIcons = signal<Array<{ name: string; icon: IconDefinition }>>([]);

  filteredIcons = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const icons = this.allIcons();

    if (!query) {
      return icons;
    }

    return icons.filter(item =>
      item.name.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadFontAwesomeIcons();
  }

  loadFontAwesomeIcons(): void {
    const icons: Array<{ name: string; icon: IconDefinition }> = [];

    // Get all solid icons from FontAwesome
    Object.keys(solidIcons).forEach(key => {
      // Filter out non-icon exports (like fas, prefix, etc.)
      if (key.startsWith('fa') && key !== 'fas' && key !== 'far' && key !== 'fal' && key !== 'fat' && key !== 'fad' && key !== 'fab') {
        const icon = (solidIcons as any)[key];
        if (icon && typeof icon === 'object' && 'iconName' in icon) {
          icons.push({
            name: key,
            icon: icon as IconDefinition
          });
        }
      }
    });

    // Sort alphabetically
    icons.sort((a, b) => a.name.localeCompare(b.name));

    this.allIcons.set(icons);
  }

  selectIcon(iconName: string): void {
    this.iconSelected.emit(iconName);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }
}
