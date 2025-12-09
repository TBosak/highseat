import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { Theme } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private http = inject(HttpClient);
  private apiUrl = '/api/themes';

  private currentTheme = signal<Theme | null>(null);
  theme = this.currentTheme.asReadonly();

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
    const root = document.documentElement;

    // Parse tokens if they're stored as JSON string
    const tokens = typeof theme.tokens === 'string'
      ? JSON.parse(theme.tokens)
      : theme.tokens;

    // Set CSS variables for base16/base24 tokens
    Object.entries(tokens).forEach(([token, value]) => {
      root.style.setProperty(`--${token}`, value as string);
    });

    // Set derived tokens
    root.style.setProperty('--bg', `var(--base00)`);
    root.style.setProperty('--bg-elevated', `var(--base01)`);
    root.style.setProperty('--text', `var(--base05)`);
    root.style.setProperty('--text-muted', `var(--base03)`);
    root.style.setProperty('--accent', `var(--base0D)`);
    root.style.setProperty('--success', `var(--base0B)`);
    root.style.setProperty('--warning', `var(--base0A)`);
    root.style.setProperty('--error', `var(--base08)`);

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
}
