import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faMoon, faSun, faArrowLeft, faSave, faEye, faHeart, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeLoaderService, ThemeDefinition } from '../../../core/services/theme-loader.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomThemeWizardComponent, CustomThemeData } from '../custom-theme-wizard/custom-theme-wizard.component';
import type { StyleMode } from '../../../core/models';

@Component({
  selector: 'app-theme-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, ScrollingModule, CustomThemeWizardComponent],
  templateUrl: './theme-browser.component.html',
  styleUrls: ['./theme-browser.component.scss']
})
export class ThemeBrowserComponent implements OnInit, OnDestroy {
  private themeLoader = inject(ThemeLoaderService);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  private resizeObserver?: ResizeObserver;

  // Icons
  faSearch = faSearch;
  faMoon = faMoon;
  faSun = faSun;
  faArrowLeft = faArrowLeft;
  faSave = faSave;
  faEye = faEye;
  faHeart = faHeart;
  faPlus = faPlus;
  faTimes = faTimes;

  // State
  allThemes = signal<ThemeDefinition[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedVariant = signal<'all' | 'dark' | 'light'>('all');
  selectedSystem = signal<'all' | 'base16' | 'base24'>('all');
  selectedStyleMode = signal<StyleMode>('minimal');
  previewTheme = signal<ThemeDefinition | null>(null);
  showWizard = signal(false);

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

  // Viewport width for responsive column calculation
  viewportWidth = signal(1920); // Default, will be updated on init

  // Calculate how many columns fit based on viewport width
  // Card min-width: 220px, gap: 1.5rem (24px), padding: 2rem each side (64px total)
  columnsPerRow = computed(() => {
    const width = this.viewportWidth();
    const cardMinWidth = 220;
    const gap = 24;
    const padding = 64;
    const availableWidth = width - padding;

    // Calculate max columns that fit
    // Formula: (width - padding + gap) / (cardWidth + gap)
    const columns = Math.floor((availableWidth + gap) / (cardMinWidth + gap));
    return Math.max(1, columns); // At least 1 column
  });

  // Group themes into rows for virtual scrolling
  themeRows = computed(() => {
    const themes = this.filteredThemes();
    const columnsPerRow = this.columnsPerRow();
    const rows: ThemeDefinition[][] = [];

    for (let i = 0; i < themes.length; i += columnsPerRow) {
      rows.push(themes.slice(i, i + columnsPerRow));
    }

    return rows;
  });

  // Dynamic item size for virtual scroll (card height + gap)
  // Card height: ~240px (60px color strip + 120px info + 60px actions)
  // Gap: 24px
  readonly virtualScrollItemSize = 264;

  ngOnInit(): void {
    this.loadThemes();
    this.loadPreviewState();
    this.setupViewportTracking();

    // Initialize style mode from user's preference
    const user = this.authService.user();
    if (user?.preferredStyleMode) {
      this.selectedStyleMode.set(user.preferredStyleMode);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  setupViewportTracking(): void {
    // Set initial viewport width
    this.viewportWidth.set(window.innerWidth);

    // Update viewport width on window resize
    this.resizeObserver = new ResizeObserver(() => {
      this.viewportWidth.set(window.innerWidth);
    });

    // Observe the document body for resize
    this.resizeObserver.observe(document.body);
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

  loadPreviewState(): void {
    const previewThemeJson = localStorage.getItem('previewTheme');
    if (previewThemeJson) {
      try {
        const theme = JSON.parse(previewThemeJson) as ThemeDefinition;
        this.previewTheme.set(theme);
      } catch (err) {
        console.error('Failed to parse preview theme from localStorage:', err);
        localStorage.removeItem('previewTheme');
      }
    }
  }

  previewThemeAction(theme: ThemeDefinition): void {
    this.previewTheme.set(theme);
    const themeObj = this.themeLoader.convertToTheme(theme, this.selectedStyleMode());

    // Apply theme temporarily (not saved to backend)
    this.themeService.applyTheme({
      id: 'preview',
      ...themeObj
    } as any);

    // Persist preview state
    localStorage.setItem('previewTheme', JSON.stringify(theme));
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
    localStorage.removeItem('previewTheme');

    // Revert to user's preferred theme
    const user = this.authService.user();
    if (user?.preferredThemeId) {
      this.themeService.getTheme(user.preferredThemeId).subscribe({
        next: (theme) => {
          this.themeService.applyTheme(theme);
        },
        error: (err) => {
          console.error('Failed to load preferred theme:', err);
        }
      });
    }
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

  openWizard(): void {
    this.showWizard.set(true);
  }

  closeWizard(): void {
    this.showWizard.set(false);
  }

  handleCustomThemeCreated(themeData: CustomThemeData): void {
    // Convert custom theme data to theme object for saving
    const themeObj = {
      name: themeData.name,
      author: themeData.author,
      variant: themeData.variant,
      isCustom: true,
      baseScheme: themeData.system,
      tokens: themeData.palette, // Pass as object, not stringified
      styleMode: this.selectedStyleMode(),
      useGlobalBackground: false
    };

    // Save to backend
    this.themeService.createTheme(themeObj).subscribe({
      next: (savedTheme) => {
        console.log('Custom theme created:', savedTheme);

        // Add to local theme list
        const newTheme: ThemeDefinition = {
          system: themeData.system,
          name: themeData.name,
          author: themeData.author,
          variant: themeData.variant,
          palette: themeData.palette,
          filename: `custom-${savedTheme.id}`
        };

        this.allThemes.update(themes => [...themes, newTheme]);
        this.showWizard.set(false);

        alert(`Custom theme "${themeData.name}" created successfully!`);
      },
      error: (err) => {
        console.error('Failed to create custom theme:', err);
        alert('Failed to create custom theme. Please try again.');
      }
    });
  }
}
