import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription, forkJoin, of } from 'rxjs';
import { switchMap, startWith, catchError, tap } from 'rxjs/operators';
import { BoardService } from './board.service';
import { PlexData, JellyfinData } from '../models';

interface WidgetCacheEntry<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

interface WidgetConfig {
  type: string;
  config: any;
  cardId: string;
}

@Injectable({
  providedIn: 'root'
})
export class WidgetPrefetchService {
  private http = inject(HttpClient);
  private boardService = inject(BoardService);

  // Cache for widget data - keyed by widget type + config hash
  private plexCache = new Map<string, BehaviorSubject<WidgetCacheEntry<PlexData>>>();
  private jellyfinCache = new Map<string, BehaviorSubject<WidgetCacheEntry<JellyfinData>>>();

  // Subscriptions for background polling
  private subscriptions = new Map<string, Subscription>();

  // Configuration
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor() {
    // Start prefetching on service initialization
    this.initializePrefetch();
  }

  /**
   * Initialize prefetch by loading all boards and starting background sync
   */
  private initializePrefetch(): void {
    console.log('[WidgetPrefetch] Initializing background sync...');

    // Load all boards and extract widget configurations
    this.boardService.getBoards().subscribe({
      next: (boards) => {
        console.log('[WidgetPrefetch] Loaded', boards.length, 'boards');

        // For each board, fetch full details to get cards and widgets
        boards.forEach(board => {
          this.boardService.getBoard(board.id).subscribe({
            next: (fullBoard) => {
              this.extractAndPrefetchWidgets(fullBoard);
            },
            error: (err) => {
              console.error('[WidgetPrefetch] Error loading board:', board.id, err);
            }
          });
        });
      },
      error: (err) => {
        console.error('[WidgetPrefetch] Error loading boards:', err);
      }
    });
  }

  /**
   * Extract widgets from board and start prefetching
   */
  private extractAndPrefetchWidgets(board: any): void {
    if (!board.tabs) return;

    board.tabs.forEach((tab: any) => {
      if (!tab.zones) return;

      tab.zones.forEach((zone: any) => {
        if (!zone.cards) return;

        zone.cards.forEach((card: any) => {
          if (!card.widgets || !Array.isArray(card.widgets)) return;

          card.widgets.forEach((widget: any) => {
            this.startPrefetching({
              type: widget.type,
              config: widget.config,
              cardId: card.id
            });
          });
        });
      });
    });
  }

  /**
   * Start prefetching for a specific widget
   */
  private startPrefetching(widget: WidgetConfig): void {
    const cacheKey = this.getCacheKey(widget);

    // Skip if already prefetching
    if (this.subscriptions.has(cacheKey)) {
      return;
    }

    console.log('[WidgetPrefetch] Starting prefetch for', widget.type, 'widget');

    switch (widget.type) {
      case 'plex':
        this.startPlexPrefetch(cacheKey, widget.config);
        break;
      case 'jellyfin':
        this.startJellyfinPrefetch(cacheKey, widget.config);
        break;
      // Add more widget types as needed
    }
  }

  /**
   * Start Plex widget prefetch
   */
  private startPlexPrefetch(cacheKey: string, config: any): void {
    if (!config.serverUrl || !config.token) {
      return;
    }

    // Create cache entry
    const cache = new BehaviorSubject<WidgetCacheEntry<PlexData>>({
      data: null,
      loading: true,
      error: null,
      lastUpdated: 0
    });
    this.plexCache.set(cacheKey, cache);

    // Start polling
    const subscription = interval(this.REFRESH_INTERVAL)
      .pipe(
        startWith(0),
        switchMap(() => {
          cache.next({ ...cache.value, loading: true });
          return this.http.post<PlexData>('/api/plex/all', {
            url: config.serverUrl,
            token: config.token,
            recentLimit: Math.max(config.recentLimit || 10, 10)
          }).pipe(
            catchError(err => {
              console.error('[WidgetPrefetch] Plex error:', err);
              cache.next({
                data: cache.value.data,
                loading: false,
                error: 'Failed to fetch Plex data',
                lastUpdated: Date.now()
              });
              return of(null);
            })
          );
        })
      )
      .subscribe({
        next: (data) => {
          if (data) {
            cache.next({
              data,
              loading: false,
              error: null,
              lastUpdated: Date.now()
            });
          }
        }
      });

    this.subscriptions.set(cacheKey, subscription);
  }

  /**
   * Start Jellyfin widget prefetch
   */
  private startJellyfinPrefetch(cacheKey: string, config: any): void {
    if (!config.serverUrl || !config.apiKey) {
      return;
    }

    // Create cache entry
    const cache = new BehaviorSubject<WidgetCacheEntry<JellyfinData>>({
      data: null,
      loading: true,
      error: null,
      lastUpdated: 0
    });
    this.jellyfinCache.set(cacheKey, cache);

    // Start polling
    const subscription = interval(this.REFRESH_INTERVAL)
      .pipe(
        startWith(0),
        switchMap(() => {
          cache.next({ ...cache.value, loading: true });
          return this.http.post<JellyfinData>('/api/jellyfin/all', {
            url: config.serverUrl,
            apiKey: config.apiKey,
            userId: config.userId,
            recentLimit: Math.max(config.recentLimit || 10, 10)
          }).pipe(
            catchError(err => {
              console.error('[WidgetPrefetch] Jellyfin error:', err);
              cache.next({
                data: cache.value.data,
                loading: false,
                error: 'Failed to fetch Jellyfin data',
                lastUpdated: Date.now()
              });
              return of(null);
            })
          );
        })
      )
      .subscribe({
        next: (data) => {
          if (data) {
            cache.next({
              data,
              loading: false,
              error: null,
              lastUpdated: Date.now()
            });
          }
        }
      });

    this.subscriptions.set(cacheKey, subscription);
  }

  /**
   * Get cached data for Plex widget
   */
  getPlexData(config: any): BehaviorSubject<WidgetCacheEntry<PlexData>> | null {
    const cacheKey = this.getCacheKey({ type: 'plex', config, cardId: '' });
    return this.plexCache.get(cacheKey) || null;
  }

  /**
   * Get cached data for Jellyfin widget
   */
  getJellyfinData(config: any): BehaviorSubject<WidgetCacheEntry<JellyfinData>> | null {
    const cacheKey = this.getCacheKey({ type: 'jellyfin', config, cardId: '' });
    return this.jellyfinCache.get(cacheKey) || null;
  }

  /**
   * Generate cache key from widget config
   */
  private getCacheKey(widget: WidgetConfig): string {
    // Create a unique key based on widget type and config
    const configStr = JSON.stringify({
      type: widget.type,
      ...widget.config
    });
    return `${widget.type}_${this.hashCode(configStr)}`;
  }

  /**
   * Simple hash function for cache key
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Manually refresh all cached data
   */
  refreshAll(): void {
    console.log('[WidgetPrefetch] Refreshing all cached data...');
    // Trigger immediate refresh by completing and restarting subscriptions
    this.subscriptions.forEach((sub, key) => {
      sub.unsubscribe();
    });
    this.subscriptions.clear();
    this.initializePrefetch();
  }

  /**
   * Clean up on service destroy
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
  }
}
