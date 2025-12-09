import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faMoon, faSun, faArrowLeft, faSave, faEye, faHeart } from '@fortawesome/free-solid-svg-icons';
import { ThemeLoaderService, ThemeDefinition } from '../../../core/services/theme-loader.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import type { StyleMode } from '../../../core/models';

@Component({
  selector: 'app-theme-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './theme-browser.component.html',
  styleUrls: ['./theme-browser.component.scss']
})
export class ThemeBrowserComponent implements OnInit {
  private themeLoader = inject(ThemeLoaderService);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Icons
  faSearch = faSearch;
  faMoon = faMoon;
  faSun = faSun;
  faArrowLeft = faArrowLeft;
  faSave = faSave;
  faEye = faEye;
  faHeart = faHeart;

  // State
  allThemes = signal<ThemeDefinition[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedVariant = signal<'all' | 'dark' | 'light'>('all');
  selectedSystem = signal<'all' | 'base16' | 'base24'>('all');
  selectedStyleMode = signal<StyleMode>('minimal');
  previewTheme = signal<ThemeDefinition | null>(null);
  showStyleModeSelector = signal(false);

  // Computed filtered themes
  filteredThemes = computed(() => {
    let themes = this.allThemes();
    const query = this.searchQuery().toLowerCase();
    const variant = this.selectedVariant();
    const system = this.selectedSystem();

    // Hide base16 themes that have base24 versions (unless specifically filtering for base16)
    if (system !== 'base16') {
      // Get all base24 theme names
      const base24Names = new Set(
        themes.filter(t => t.system === 'base24').map(t => t.name)
      );

      // Filter out base16 themes that have a base24 version
      themes = themes.filter(t =>
        t.system === 'base24' || !base24Names.has(t.name)
      );
    }

    if (query) {
      themes = themes.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.author.toLowerCase().includes(query)
      );
    }

    if (variant !== 'all') {
      themes = themes.filter(t => t.variant === variant);
    }

    if (system !== 'all') {
      themes = themes.filter(t => t.system === system);
    }

    return themes;
  });

  // Style mode options
  styleModes: { value: StyleMode; label: string }[] = [
    { value: 'minimal', label: 'Minimal' },
    { value: 'glassmorphic', label: 'Glassmorphic' },
    { value: 'neobrutal', label: 'Neobrutal' },
    { value: 'clay', label: 'Clay' }
  ];

  constructor() {
    // Watch for style mode changes and update the current theme
    effect(() => {
      const styleMode = this.selectedStyleMode();

      // Use untracked to read current theme without subscribing to it
      // This prevents infinite loops when we update the theme
      untracked(() => {
        const currentTheme = this.themeService.theme();

        // Only update if theme exists and style mode is different
        if (currentTheme && currentTheme.styleMode !== styleMode) {
          // Update the current theme with the new style mode
          this.themeService.applyTheme({
            ...currentTheme,
            styleMode
          });
        }
      });
    });
  }

  ngOnInit(): void {
    this.loadThemes();
  }

  loadThemes(): void {
    this.loading.set(true);
    this.themeLoader.loadAllThemes().subscribe({
      next: (themes) => {
        console.log(`Loaded ${themes.length} themes`);
        this.allThemes.set(themes);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load themes:', err);
        this.loading.set(false);
      }
    });
  }

  previewThemeAction(theme: ThemeDefinition): void {
    this.previewTheme.set(theme);
    const themeObj = this.themeLoader.convertToTheme(theme, this.selectedStyleMode());

    // Apply theme temporarily (not saved to backend)
    this.themeService.applyTheme({
      id: 'preview',
      ...themeObj
    } as any);
  }

  saveTheme(theme: ThemeDefinition): void {
    const themeObj = this.themeLoader.convertToTheme(theme, this.selectedStyleMode());

    this.themeService.createTheme(themeObj).subscribe({
      next: (savedTheme) => {
        console.log('Theme saved:', savedTheme);
        alert(`Theme "${theme.name}" saved successfully!`);
      },
      error: (err) => {
        console.error('Failed to save theme:', err);
        alert('Failed to save theme. Please try again.');
      }
    });
  }

  setAsPreferred(theme: ThemeDefinition): void {
    const themeObj = this.themeLoader.convertToTheme(theme, this.selectedStyleMode());

    // First, save the theme if it doesn't exist
    this.themeService.createTheme(themeObj).subscribe({
      next: (savedTheme) => {
        // Then set it as user's preferred theme
        this.authService.updateUserThemePreference(savedTheme.id, this.selectedStyleMode()).subscribe({
          next: () => {
            alert(`Theme "${theme.name}" set as your preferred theme! It will be applied when you log in.`);
            // Apply it immediately
            this.themeService.applyTheme(savedTheme);
          },
          error: (err) => {
            console.error('Failed to set theme preference:', err);
            alert('Failed to set theme preference. Please try again.');
          }
        });
      },
      error: (err) => {
        console.error('Failed to save theme:', err);
        alert('Failed to save theme. Please try again.');
      }
    });
  }

  clearPreview(): void {
    this.previewTheme.set(null);
    // Optionally reset to default theme
  }

  goBack(): void {
    this.router.navigate(['/boards']);
  }

  getThemePreviewColors(theme: ThemeDefinition): string[] {
    // Return a subset of colors for the preview card
    return [
      theme.palette['base00'],
      theme.palette['base01'],
      theme.palette['base0D'],
      theme.palette['base0B'],
      theme.palette['base08'],
      theme.palette['base0A'],
      theme.palette['base0E'],
      theme.palette['base0C']
    ];
  }
}
