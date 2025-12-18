import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, shareReplay } from 'rxjs';

export interface ThemeDefinition {
  system: 'base16' | 'base24';
  name: string;
  author: string;
  variant: 'dark' | 'light';
  palette: Record<string, string>;
  filename: string; // Added for tracking
}

@Injectable({
  providedIn: 'root'
})
export class ThemeLoaderService {
  private http = inject(HttpClient);

  // Cache bundled themes (static, never change at runtime)
  private bundledThemes$: Observable<ThemeDefinition[]> | null = null;

  /**
   * Loads all Base16 and Base24 theme definitions from both:
   * 1. Bundled themes (themes.json) - cached in memory
   * 2. Custom themes (from database via API) - always fresh
   */
  loadAllThemes(): Observable<ThemeDefinition[]> {
    return forkJoin({
      bundled: this.loadBundledThemesCached(),
      custom: this.loadCustomThemes()
    }).pipe(
      map(({ bundled, custom }) => {
        const allThemes = [...bundled, ...custom];
        return allThemes;
      }),
      catchError(err => {
        console.error('Failed to load themes:', err);
        return of([]);
      })
    );
  }

  /**
   * Loads bundled themes with in-memory caching
   * Bundled themes never change at runtime, safe to cache aggressively
   */
  private loadBundledThemesCached(): Observable<ThemeDefinition[]> {
    if (!this.bundledThemes$) {
      this.bundledThemes$ = this.loadBundledThemes().pipe(
        shareReplay(1) // Cache in memory for the session
      );
    }
    return this.bundledThemes$;
  }

  /**
   * Clear the bundled themes cache (useful for development/testing)
   */
  clearCache(): void {
    this.bundledThemes$ = null;
  }

  /**
   * Loads bundled themes from themes.json
   */
  private loadBundledThemes(): Observable<ThemeDefinition[]> {
    return this.http.get<{ themes: any[] }>('/themes.json').pipe(
      map(parsed => {
        try {
          if (!parsed || !parsed.themes || !Array.isArray(parsed.themes)) {
            console.error('Invalid themes file structure');
            return [];
          }

          const themes = parsed.themes.map(t => {
            // Handle both palette formats
            let palette: Record<string, string>;
            if (t.palette) {
              palette = t.palette;
            } else {
              palette = {};
              const colorKeys = Object.keys(t).filter(key => key.startsWith('base'));
              colorKeys.forEach(key => {
                palette[key] = t[key];
              });
            }

            return {
              system: t.system,
              name: t.name,
              author: t.author || 'Unknown',
              variant: t.variant || 'dark',
              palette,
              filename: t.filename
            } as ThemeDefinition;
          });

          const validThemes = themes.filter(t => t && t.name);
          return validThemes;
        } catch (err) {
          console.error('Failed to parse themes.json:', err);
          return [];
        }
      }),
      catchError(err => {
        console.error('Failed to load bundled themes:', err);
        return of([]);
      })
    );
  }

  /**
   * Loads custom themes from the database via API
   */
  private loadCustomThemes(): Observable<ThemeDefinition[]> {
    return this.http.get<any[]>('/api/themes/custom').pipe(
      map(customThemes => {
        return customThemes.map(t => {
          // Parse tokens from JSON string to object
          const tokens = typeof t.tokens === 'string' ? JSON.parse(t.tokens) : t.tokens;

          return {
            system: t.baseScheme as 'base16' | 'base24',
            name: t.name,
            author: t.author || 'Unknown',
            variant: t.variant || 'dark',
            palette: tokens,
            filename: `custom-${t.id}`
          } as ThemeDefinition;
        });
      }),
      catchError(err => {
        console.error('Failed to load custom themes:', err);
        return of([]);
      })
    );
  }

  /**
   * Converts a ThemeDefinition to the Theme format expected by the backend
   */
  convertToTheme(themeDef: ThemeDefinition, styleMode: 'minimal' | 'glassmorphic' | 'neobrutal' | 'clay' | 'custom' = 'minimal'): {
    name: string;
    baseScheme: 'base16' | 'base24';
    tokens: Record<string, string>;
    styleMode: 'minimal' | 'glassmorphic' | 'neobrutal' | 'clay' | 'custom';
    useGlobalBackground: boolean;
  } {
    return {
      name: themeDef.name,
      baseScheme: themeDef.system,
      tokens: themeDef.palette,
      styleMode,
      useGlobalBackground: false
    };
  }
}
