import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faRss, faSpinner, faRefresh, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { RssWidgetConfig, RssFeed } from '../../../core/models';

@Component({
  selector: 'app-rss-widget',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './rss-widget.component.html',
  styleUrls: ['./rss-widget.component.scss']
})
export class RssWidgetComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private subscription?: Subscription;

  @Input() config!: RssWidgetConfig;

  faRss = faRss;
  faSpinner = faSpinner;
  faRefresh = faRefresh;
  faExternalLinkAlt = faExternalLinkAlt;

  rssFeed = signal<RssFeed | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.config.feedUrl) {
      this.error.set('RSS feed URL is required');
      this.loading.set(false);
      return;
    }

    const refreshInterval = (this.config.refreshInterval || 300) * 1000; // Default 5 minutes

    this.subscription = interval(refreshInterval)
      .pipe(
        startWith(0), // Fetch immediately on init
        switchMap(() => this.fetchRssFeed()),
        catchError((err) => {
          console.error('[RSS Widget] Error fetching feed:', err);
          this.error.set('Failed to fetch RSS feed');
          this.loading.set(false);
          return [];
        })
      )
      .subscribe({
        next: (data) => {
          this.rssFeed.set(data);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          console.error('[RSS Widget] Subscription error:', err);
          this.error.set('Failed to fetch RSS feed');
          this.loading.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private fetchRssFeed() {
    return this.http.post<RssFeed>('/api/rss/fetch', {
      url: this.config.feedUrl,
      limit: this.config.itemLimit || 10
    });
  }

  /**
   * Manually refresh feed
   */
  refresh(): void {
    this.loading.set(true);
    this.fetchRssFeed().subscribe({
      next: (data) => {
        this.rssFeed.set(data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        console.error('[RSS Widget] Refresh error:', err);
        this.error.set('Failed to refresh RSS feed');
        this.loading.set(false);
      }
    });
  }

  /**
   * Format publish date
   */
  formatDate(dateString?: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Strip HTML tags from description
   */
  stripHtml(html?: string): string {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Truncate text to specified length
   */
  truncate(text: string, length: number = 150): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  /**
   * Open link in new tab
   */
  openLink(url: string, event: Event): void {
    event.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
