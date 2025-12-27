import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WidgetPrefetchService } from './core/services/widget-prefetch.service';
import { SettingsService } from './core/services/settings.service';
import { CustomCssService } from './core/services/custom-css.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('dash-frontend');

  // Inject prefetch service to start background sync immediately
  private prefetchService = inject(WidgetPrefetchService);
  private settingsService = inject(SettingsService);
  private customCssService = inject(CustomCssService);

  constructor() {
    console.log('[App] Widget prefetch service initialized');

    // Load and inject global custom CSS
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        if (settings.globalCustomCss) {
          this.customCssService.injectGlobalCss(settings.globalCustomCss);
          console.log('[App] Global custom CSS loaded');
        }
      },
      error: (err) => {
        console.error('[App] Failed to load global custom CSS:', err);
      }
    });
  }
}
