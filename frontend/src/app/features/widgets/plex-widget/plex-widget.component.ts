import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlay, faPause, faSpinner, faFilm, faTv, faMusic, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { PlexWidgetConfig, PlexSession, PlexRecentItem, PlexData } from '../../../core/models';
import { IconCatalogService } from '../../../core/services/icon-catalog.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-plex-widget',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './plex-widget.component.html',
  styleUrls: ['./plex-widget.component.scss']
})
export class PlexWidgetComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private iconCatalog = inject(IconCatalogService);
  private themeService = inject(ThemeService);
  private subscription?: Subscription;

  @Input() config!: PlexWidgetConfig;

  // Get Plex logo based on theme
  plexLogoUrl = computed(() => {
    const themeVariant = this.themeService.themeVariant();
    return this.iconCatalog.getIconForThemeVariant('plex', themeVariant) || '/app-icons/svg/plex.svg';
  });

  faPlay = faPlay;
  faPause = faPause;
  faSpinner = faSpinner;
  faFilm = faFilm;
  faTv = faTv;
  faMusic = faMusic;
  faRefresh = faRefresh;

  plexData = signal<PlexData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.config.serverUrl || !this.config.token) {
      this.error.set('Plex server URL and token are required');
      this.loading.set(false);
      return;
    }

    const refreshInterval = (this.config.refreshInterval || 10) * 1000;

    // Poll Plex API at specified interval
    this.subscription = interval(refreshInterval)
      .pipe(
        startWith(0), // Fetch immediately on init
        switchMap(() => this.fetchPlexData()),
        catchError((err) => {
          console.error('[Plex Widget] Error fetching data:', err);
          this.error.set('Failed to connect to Plex server');
          this.loading.set(false);
          return [];
        })
      )
      .subscribe({
        next: (data) => {
          this.plexData.set(data);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          console.error('[Plex Widget] Subscription error:', err);
          this.error.set('Failed to fetch Plex data');
          this.loading.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private fetchPlexData() {
    return this.http.post<PlexData>('/api/plex/all', {
      url: this.config.serverUrl,
      token: this.config.token,
      recentLimit: Math.max(this.config.recentLimit || 10, 10)
    });
  }

  /**
   * Get icon for media type
   */
  getMediaIcon(type: string) {
    switch (type) {
      case 'movie':
        return this.faFilm;
      case 'episode':
        return this.faTv;
      case 'track':
      case 'album':
        return this.faMusic;
      default:
        return this.faFilm;
    }
  }

  /**
   * Get display title for media item
   */
  getDisplayTitle(item: PlexSession | PlexRecentItem): string {
    if (item.type === 'episode' && item.grandparentTitle) {
      return `${item.grandparentTitle} - ${item.title}`;
    }
    return item.title;
  }

  /**
   * Get subtitle for media item
   */
  getSubtitle(item: PlexSession | PlexRecentItem): string {
    if (item.type === 'episode' && item.parentTitle) {
      return item.parentTitle;
    }
    if (item.year) {
      return item.year.toString();
    }
    return '';
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(thumbPath?: string): string {
    if (!thumbPath || !this.config.serverUrl || !this.config.token) {
      return '';
    }
    return `${this.config.serverUrl}${thumbPath}?X-Plex-Token=${this.config.token}`;
  }

  /**
   * Format time ago
   */
  getTimeAgo(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes}m ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400);
      return `${days}d ago`;
    }
  }

  /**
   * Manually refresh data
   */
  refresh(): void {
    this.loading.set(true);
    this.fetchPlexData().subscribe({
      next: (data) => {
        this.plexData.set(data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        console.error('[Plex Widget] Refresh error:', err);
        this.error.set('Failed to refresh Plex data');
        this.loading.set(false);
      }
    });
  }
}
