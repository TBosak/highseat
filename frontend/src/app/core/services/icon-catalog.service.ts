import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, shareReplay } from 'rxjs';

export interface IconVariant {
  name: string;
  path: string;
}

export interface IconMetadata {
  base: string;
  variants: IconVariant[];
}

export interface AppIcon {
  id: string;
  name: string;
  aliases: string[];
  categories: string[];
  icons: IconMetadata;
  lastUpdate: string | null;
}

export interface IconIndex {
  version: string;
  generated: string;
  totalApps: number;
  apps: AppIcon[];
}

export interface IconCatalogEntry {
  id: string;
  name: string;
  category: string;
  iconUrl: string;
  variants: IconVariant[];
  aliases: string[];
  tags?: string[];
}

export interface IconCategory {
  id: string;
  name: string;
  icons: IconCatalogEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class IconCatalogService {
  private http = inject(HttpClient);
  private readonly indexUrl = '/app-icons/index.json';

  private iconIndex$: Observable<IconIndex> | null = null;
  private catalogEntries = signal<IconCatalogEntry[]>([]);
  private loaded = signal(false);

  /**
   * Load the icon index from the JSON file
   */
  private loadIndex(): Observable<IconIndex> {
    if (!this.iconIndex$) {
      this.iconIndex$ = this.http.get<IconIndex>(this.indexUrl).pipe(
        tap(index => {
          // Convert apps to catalog entries
          const entries = index.apps.map(app => this.convertToCatalogEntry(app));
          this.catalogEntries.set(entries);
          this.loaded.set(true);
        }),
        shareReplay(1)
      );
    }
    return this.iconIndex$;
  }

  /**
   * Convert AppIcon to IconCatalogEntry
   */
  private convertToCatalogEntry(app: AppIcon): IconCatalogEntry {
    // Get the default icon variant (prefer default, fallback to first variant)
    const defaultVariant = app.icons.variants.find(v => v.name === 'default') || app.icons.variants[0];

    // Use first category or 'other'
    const category = app.categories[0]?.toLowerCase() || 'other';

    return {
      id: app.id,
      name: app.name,
      category,
      iconUrl: defaultVariant?.path || '',
      variants: app.icons.variants,
      aliases: app.aliases,
      tags: [...app.categories, ...app.aliases]
    };
  }

  /**
   * Get all icons grouped by category
   */
  getCategories(): Observable<IconCategory[]> {
    return this.loadIndex().pipe(
      map(() => {
        const categoryMap = new Map<string, IconCategory>();
        const entries = this.catalogEntries();

        entries.forEach(icon => {
          if (!categoryMap.has(icon.category)) {
            categoryMap.set(icon.category, {
              id: icon.category,
              name: this.getCategoryDisplayName(icon.category),
              icons: []
            });
          }
          categoryMap.get(icon.category)!.icons.push(icon);
        });

        return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  /**
   * Get all icons as a flat list
   */
  getAllIcons(): Observable<IconCatalogEntry[]> {
    return this.loadIndex().pipe(
      map(() => [...this.catalogEntries()])
    );
  }

  /**
   * Search icons by name, alias, or category
   */
  searchIcons(query: string): Observable<IconCatalogEntry[]> {
    return this.loadIndex().pipe(
      map(() => {
        if (!query) return [...this.catalogEntries()];

        const lowerQuery = query.toLowerCase();
        return this.catalogEntries().filter(icon =>
          icon.name.toLowerCase().includes(lowerQuery) ||
          icon.aliases.some(alias => alias.toLowerCase().includes(lowerQuery)) ||
          icon.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      })
    );
  }

  /**
   * Get a specific icon by ID
   */
  getIconById(id: string): IconCatalogEntry | undefined {
    return this.catalogEntries().find(icon => icon.id === id);
  }

  /**
   * Get icon variant by name (default, light, dark)
   */
  getIconVariant(iconId: string, variantName: string = 'default'): string | null {
    const icon = this.getIconById(iconId);
    if (!icon) return null;

    const variant = icon.variants.find(v => v.name === variantName);
    return variant?.path || icon.iconUrl;
  }

  /**
   * Check if icons are loaded
   */
  isLoaded(): boolean {
    return this.loaded();
  }

  private getCategoryDisplayName(category: string): string {
    // Capitalize and format category names
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
