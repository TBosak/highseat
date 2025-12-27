import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlay, faPause, faSpinner, faFilm, faTv, faMusic, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { JellyfinWidgetConfig, JellyfinSession, JellyfinRecentItem, JellyfinData } from '../../../core/models';
import { IconCatalogService } from '../../../core/services/icon-catalog.service';
import { ThemeService } from '../../../core/services/theme.service';
import { WidgetPrefetchService } from '../../../core/services/widget-prefetch.service';

@Component({
  selector: 'app-jellyfin-widget',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './jellyfin-widget.component.html',
  styleUrls: ['./jellyfin-widget.component.scss']
})
export class JellyfinWidgetComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private iconCatalog = inject(IconCatalogService);
  private themeService = inject(ThemeService);
  private prefetchService = inject(WidgetPrefetchService);
  private subscription?: Subscription;

  @Input() config!: JellyfinWidgetConfig;

  // Get Jellyfin logo based on theme
  jellyfinLogoUrl = computed(() => {
    const themeVariant = this.themeService.themeVariant();
    return this.iconCatalog.getIconForThemeVariant('jellyfin', themeVariant) || '/app-icons/svg/jellyfin.svg';
  });

  faPlay = faPlay;
  faPause = faPause;
  faSpinner = faSpinner;
  faFilm = faFilm;
  faTv = faTv;
  faMusic = faMusic;
  faRefresh = faRefresh;

  jellyfinData = signal<JellyfinData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.config.serverUrl || !this.config.apiKey) {
      this.error.set('Jellyfin server URL and API key are required');
      this.loading.set(false);
      return;
    }

    // Try to use prefetched data first
    const cachedData = this.prefetchService.getJellyfinData(this.config);

    if (cachedData) {
      // Subscribe to prefetched data stream
      console.log('[Jellyfin Widget] Using prefetched data');
      this.subscription = cachedData.subscribe(entry => {
        this.jellyfinData.set(entry.data);
        this.loading.set(entry.loading && !entry.data); // Only show loading if no data yet
        this.error.set(entry.error);
      });
    } else {
      // Fallback to widget-specific polling
      console.log('[Jellyfin Widget] No prefetch available, using local polling');
      const refreshInterval = (this.config.refreshInterval || 10) * 1000;

      this.subscription = interval(refreshInterval)
        .pipe(
          startWith(0), // Fetch immediately on init
          switchMap(() => this.fetchJellyfinData()),
          catchError((err) => {
            console.error('[Jellyfin Widget] Error fetching data:', err);
            this.error.set('Failed to connect to Jellyfin server');
            this.loading.set(false);
            return [];
          })
        )
        .subscribe({
          next: (data) => {
            this.jellyfinData.set(data);
            this.loading.set(false);
            this.error.set(null);
          },
          error: (err) => {
            console.error('[Jellyfin Widget] Subscription error:', err);
            this.error.set('Failed to fetch Jellyfin data');
            this.loading.set(false);
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private fetchJellyfinData() {
    return this.http.post<JellyfinData>('/api/jellyfin/all', {
      url: this.config.serverUrl,
      apiKey: this.config.apiKey,
      recentLimit: Math.max(this.config.recentLimit || 10, 10)
    });
  }

  /**
   * Get icon for media type
   */
  getMediaIcon(type: string) {
    switch (type.toLowerCase()) {
      case 'movie':
        return this.faFilm;
      case 'episode':
      case 'series':
        return this.faTv;
      case 'audio':
      case 'musicalbum':
        return this.faMusic;
      default:
        return this.faFilm;
    }
  }

  /**
   * Get display title for media item
   */
  getDisplayTitle(session: JellyfinSession): string {
    if (!session.NowPlayingItem) return '';

    const item = session.NowPlayingItem;
    if (item.Type === 'Episode' && item.SeriesName) {
      return `${item.SeriesName} - ${item.Name}`;
    }
    return item.Name;
  }

  /**
   * Get subtitle for media item
   */
  getSubtitle(session: JellyfinSession): string {
    if (!session.NowPlayingItem) return '';

    const item = session.NowPlayingItem;
    if (item.Type === 'Episode' && item.SeasonName) {
      return item.SeasonName;
    }
    return '';
  }

  /**
   * Get recent item title
   */
  getRecentTitle(item: JellyfinRecentItem): string {
    if (item.Type === 'Episode' && item.SeriesName) {
      return `${item.SeriesName} - ${item.Name}`;
    }
    return item.Name;
  }

  /**
   * Get recent item subtitle
   */
  getRecentSubtitle(item: JellyfinRecentItem): string {
    if (item.ProductionYear) {
      return item.ProductionYear.toString();
    }
    return '';
  }

  /**
   * Format time ago
   */
  getTimeAgo(dateString?: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

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
   * Get playback progress percentage
   */
  getProgress(session: JellyfinSession): number {
    if (!session.PlayState?.PositionTicks || !session.NowPlayingItem) return 0;

    // Jellyfin uses ticks (10000 ticks = 1ms)
    // We need runtime ticks which should be in the NowPlayingItem
    // For now, return 0 as we'd need runtime data
    return 0;
  }

  /**
   * Check if session is paused
   */
  isPaused(session: JellyfinSession): boolean {
    return session.PlayState?.IsPaused || false;
  }

  /**
   * Manually refresh data
   */
  refresh(): void {
    this.loading.set(true);
    this.fetchJellyfinData().subscribe({
      next: (data) => {
        this.jellyfinData.set(data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        console.error('[Jellyfin Widget] Refresh error:', err);
        this.error.set('Failed to refresh Jellyfin data');
        this.loading.set(false);
      }
    });
  }
}
