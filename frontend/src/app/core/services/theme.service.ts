import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { Theme } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private http = inject(HttpClient);
  private apiUrl = '/api/themes';
  private readonly THEME_CACHE_KEY = 'cached_theme';

  private currentTheme = signal<Theme | null>(null);
  theme = this.currentTheme.asReadonly();

  // Computed signal for theme variant (light/dark)
  themeVariant = computed<'light' | 'dark'>(() => {
    const theme = this.currentTheme();
    // Default to 'dark' if variant not specified
    return theme?.variant === 'light' ? 'light' : 'dark';
  });

  constructor() {
    // Apply cached theme immediately on service initialization
    const cachedTheme = this.getCachedTheme();
    if (cachedTheme) {
      this.applyTheme(cachedTheme);
    }
  }

  getThemes(): Observable<Theme[]> {
    return this.http.get<Theme[]>(this.apiUrl);
  }

  getTheme(themeId: string): Observable<Theme> {
    return this.http.get<Theme>(`${this.apiUrl}/${themeId}`);
  }

  createTheme(theme: Partial<Theme>): Observable<Theme> {
    return this.http.post<Theme>(this.apiUrl, theme);
  }

  updateTheme(themeId: string, theme: Partial<Theme>): Observable<Theme> {
    return this.http.patch<Theme>(`${this.apiUrl}/${themeId}`, theme);
  }

  deleteTheme(themeId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${themeId}`);
  }

  applyTheme(theme: Theme): void {
    this.currentTheme.set(theme);

    // Cache theme to localStorage for instant application on page load
    this.cacheTheme(theme);

    const root = document.documentElement;

    // Parse tokens if they're stored as JSON string
    const tokens = typeof theme.tokens === 'string'
      ? JSON.parse(theme.tokens)
      : theme.tokens;

    // Set CSS variables for base16/base24 tokens
    Object.entries(tokens).forEach(([token, value]) => {
      root.style.setProperty(`--${token}`, value as string);
    });

    // Check if this is a base24 theme
    const isBase24 = 'base10' in tokens;

    // Set derived tokens
    root.style.setProperty('--bg', `var(--base00)`);
    root.style.setProperty('--bg-elevated', `var(--base01)`);
    root.style.setProperty('--bg-darker', isBase24 ? `var(--base10)` : `var(--base01)`);
    root.style.setProperty('--bg-darkest', isBase24 ? `var(--base11)` : `var(--base00)`);
    root.style.setProperty('--text', `var(--base05)`);
    root.style.setProperty('--text-muted', `var(--base03)`);
    root.style.setProperty('--accent', `var(--base0D)`);
    root.style.setProperty('--accent-alt', isBase24 ? `var(--base16)` : `var(--base0D)`);
    root.style.setProperty('--success', `var(--base0B)`);
    root.style.setProperty('--success-alt', isBase24 ? `var(--base14)` : `var(--base0B)`);
    root.style.setProperty('--warning', `var(--base0A)`);
    root.style.setProperty('--warning-alt', isBase24 ? `var(--base13)` : `var(--base0A)`);
    root.style.setProperty('--error', `var(--base08)`);
    root.style.setProperty('--error-alt', isBase24 ? `var(--base12)` : `var(--base08)`);
    root.style.setProperty('--info', isBase24 ? `var(--base15)` : `var(--base0C)`);
    root.style.setProperty('--highlight', isBase24 ? `var(--base17)` : `var(--base0E)`);

    // Set style mode
    root.setAttribute('data-style-mode', theme.styleMode);

    // Apply background if configured
    if (theme.useGlobalBackground && theme.backgroundType) {
      this.applyBackground(theme);
    }
  }

  private applyBackground(theme: Theme): void {
    const root = document.documentElement;

    switch (theme.backgroundType) {
      case 'color':
        root.style.setProperty('--board-bg', theme.backgroundValue || 'var(--base00)');
        root.style.setProperty('--board-bg-image', 'none');
        break;

      case 'image':
      case 'pexels':
        root.style.setProperty('--board-bg-image', `url(${theme.backgroundValue})`);
        if (theme.backgroundBlur) {
          root.style.setProperty('--board-bg-blur', `${theme.backgroundBlur}px`);
        }
        if (theme.backgroundOpacity) {
          root.style.setProperty('--board-bg-opacity', `${theme.backgroundOpacity / 100}`);
        }
        break;
    }
  }

  private cacheTheme(theme: Theme): void {
    try {
      localStorage.setItem(this.THEME_CACHE_KEY, JSON.stringify(theme));
    } catch (error) {
      console.warn('Failed to cache theme to localStorage:', error);
    }
  }

  private getCachedTheme(): Theme | null {
    try {
      const cached = localStorage.getItem(this.THEME_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to retrieve cached theme from localStorage:', error);
      return null;
    }
  }
}
