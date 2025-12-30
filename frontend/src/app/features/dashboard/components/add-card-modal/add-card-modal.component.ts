import { Component, OnInit, OnDestroy, Output, EventEmitter, inject, signal, effect, computed, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faTimes, faLink, faImage, faStickyNote, faLightbulb, faMicrochip, faListCheck, faNetworkWired, faFilm, faClock, faRss, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { IconCatalogService, IconCatalogEntry, IconCategory } from '../../../../core/services/icon-catalog.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { AddCardModalService } from '../../../../core/services/add-card-modal.service';
import { CardService } from '../../../../core/services/card.service';
import { Subject, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PlexWidgetFormComponent } from '../widget-forms/plex-widget-form.component';
import { JellyfinWidgetFormComponent } from '../widget-forms/jellyfin-widget-form.component';
import { RssWidgetFormComponent } from '../widget-forms/rss-widget-form.component';
import { CalendarWidgetFormComponent } from '../widget-forms/calendar-widget-form.component';
import { ClockWidgetFormComponent } from '../widget-forms/clock-widget-form.component';
import { WidgetFormComponent } from '../widget-forms/widget-form.interface';

@Component({
  selector: 'app-add-card-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    PlexWidgetFormComponent,
    JellyfinWidgetFormComponent,
    RssWidgetFormComponent,
    CalendarWidgetFormComponent,
    ClockWidgetFormComponent
  ],
  templateUrl: './add-card-modal.component.html',
  styleUrls: ['./add-card-modal.component.scss']
})
export class AddCardModalComponent implements OnInit, OnDestroy {
  private iconCatalog = inject(IconCatalogService);
  private themeService = inject(ThemeService);
  private addCardModal = inject(AddCardModalService);
  private cardService = inject(CardService);
  private http = inject(HttpClient);

  @Output() cardCreated = new EventEmitter<{
    title: string;
    subtitle?: string;
    url?: string;
    iconSource: 'catalog' | 'custom';
    iconCatalogId?: string;
    iconCustomUrl?: string;
  }>();

  @Output() cancelled = new EventEmitter<void>();

  // Dynamic ViewChild reference to the currently displayed widget form
  @ViewChild('widgetForm') widgetFormComponent?: WidgetFormComponent;

  // Icons
  faSearch = faSearch;
  faTimes = faTimes;
  faLink = faLink;
  faImage = faImage;
  faStickyNote = faStickyNote;
  faLightbulb = faLightbulb;
  faMicrochip = faMicrochip;
  faListCheck = faListCheck;
  faNetworkWired = faNetworkWired;
  faFilm = faFilm;
  faClock = faClock;
  faRss = faRss;
  faCalendar = faCalendar;

  // Media server icons from catalog
  plexIconUrl = computed(() => {
    const themeVariant = this.themeService.themeVariant();
    return this.iconCatalog.getIconForThemeVariant('plex', themeVariant) || '/app-icons/svg/plex.svg';
  });

  jellyfinIconUrl = computed(() => {
    const themeVariant = this.themeService.themeVariant();
    return this.iconCatalog.getIconForThemeVariant('jellyfin', themeVariant) || '/app-icons/svg/jellyfin.svg';
  });

  // Card type
  cardType = signal<'regular' | 'widget'>('regular');
  widgetType = signal<'note' | 'system-metrics' | 'system-processes' | 'system-network' | 'plex' | 'jellyfin' | 'clock' | 'rss' | 'calendar'>('note');

  // Form fields
  title = signal('');
  subtitle = signal('');
  url = signal('');

  // Plex widget fields
  plexServerUrl = signal('');
  plexToken = signal('');

  // Jellyfin widget fields
  jellyfinServerUrl = signal('');
  jellyfinApiKey = signal('');

  // Clock widget fields
  clockFormat = signal<'12h' | '24h'>('24h');
  clockShowSeconds = signal(true);
  clockShowDate = signal(true);
  clockStyle = signal<'digital' | 'analog'>('digital');

  // RSS widget fields
  rssFeedUrl = signal('');
  rssWidgetName = signal('');
  rssItemLimit = signal(10);
  rssShowDescription = signal(true);
  rssShowPublishDate = signal(true);

  // Calendar widget fields
  calendarSourceType = signal<'ics' | 'caldav'>('ics');
  calendarSourceName = signal('');
  calendarSourceColor = signal('#3788d8');
  calendarIcsFeedUrl = signal('');
  calendarCaldavServerUrl = signal('');
  calendarCaldavUsername = signal('');
  calendarCaldavPassword = signal('');

  // Icon selection
  iconSource = signal<'catalog' | 'custom'>('catalog');
  selectedIconId = signal<string | null>(null);
  customIconUrl = signal('');
  iconSearchQuery = signal('');

  // Widget search
  widgetSearchQuery = signal('');

  // Widget definitions
  readonly availableWidgets = [
    {
      type: 'clock' as const,
      name: 'Clock',
      description: 'Customizable time display',
      icon: this.faClock,
      iconType: 'fontawesome' as const,
      configComponent: ClockWidgetFormComponent,
      defaults: {
        title: 'Clock',
        layoutW: 3,
        layoutH: 2,
        layoutMinW: 3,
        layoutMinH: 2
      },
      info: {
        title: 'Clock Widget',
        description: 'Displays the current time in digital or analog format. Choose between 12-hour or 24-hour format, toggle seconds display, and show/hide the date.',
        tip: 'The analog clock shows a traditional clock face with hour, minute, and optional second hands.'
      }
    },
    {
      type: 'note' as const,
      name: 'Note',
      description: 'Rich text notepad with formatting',
      icon: this.faStickyNote,
      iconType: 'fontawesome' as const,
      configComponent: null,
      defaults: {
        title: 'Note',
        layoutW: 2,
        layoutH: 2,
        layoutMinW: 2,
        layoutMinH: 2
      },
      info: {
        title: 'Note Widget',
        description: 'A rich text editor will be added to your card. You can format text, add headings, lists, and more. The widget auto-saves your notes every 2 seconds.',
        tip: 'Make the card larger (2x2 or bigger) for a better editing experience.'
      }
    },
    {
      type: 'rss' as const,
      name: 'RSS Feed',
      description: 'Scrollable RSS feed reader',
      icon: this.faRss,
      iconType: 'fontawesome' as const,
      configComponent: RssWidgetFormComponent,
      defaults: {
        title: 'RSS Feed',
        layoutW: 3,
        layoutH: 6,
        layoutMinW: 3,
        layoutMinH: 4
      },
      info: {
        title: 'RSS Feed Widget',
        description: 'Displays a scrollable list of items from any RSS or Atom feed. Shows article titles, descriptions, publish dates, and authors. Updates automatically every 5 minutes.',
        tip: 'Click on any feed item to open the article in a new tab.'
      }
    },
    {
      type: 'calendar' as const,
      name: 'Calendar',
      description: 'Display events from calendars',
      icon: this.faCalendar,
      iconType: 'fontawesome' as const,
      configComponent: CalendarWidgetFormComponent,
      defaults: {
        title: 'Calendar',
        layoutW: 4,
        layoutH: 6,
        layoutMinW: 4,
        layoutMinH: 5
      },
      info: {
        title: 'Calendar Widget',
        description: 'Displays events from ICS calendar feeds. Shows monthly, weekly, or daily views with color-coded events. Click events to see details. Updates automatically every 5 minutes.',
        tip: 'Get your Google Calendar ICS feed URL from Calendar Settings → Integrate Calendar → Secret address in iCal format.'
      }
    },
    {
      type: 'system-metrics' as const,
      name: 'System Metrics',
      description: 'CPU, RAM, and Disk usage',
      icon: this.faMicrochip,
      iconType: 'fontawesome' as const,
      configComponent: null,
      defaults: {
        title: 'System Metrics',
        layoutW: 3,
        layoutH: 5,
        layoutMinW: 3,
        layoutMinH: 5,
        layoutMaxW: 3,
        layoutMaxH: 5
      },
      info: {
        title: 'System Metrics Widget',
        description: 'Displays real-time CPU, RAM, and Disk usage with color-coded indicators. Updates automatically every 2.5 seconds via WebSocket.',
        tip: 'Usage levels are shown with three colors: normal (below 60%), warning (60-80%), and critical (above 80%).'
      }
    },
    {
      type: 'system-network' as const,
      name: 'Network',
      description: 'Network throughput and stats',
      icon: this.faNetworkWired,
      iconType: 'fontawesome' as const,
      configComponent: null,
      defaults: {
        title: 'Network Stats',
        layoutW: 3,
        layoutH: 4,
        layoutMinW: 3,
        layoutMinH: 4,
        layoutMaxW: 3,
        layoutMaxH: 4
      },
      info: {
        title: 'Network Widget',
        description: 'Displays real-time network throughput (upload/download speeds) and interface statistics. Shows data for all active network interfaces.',
        tip: 'Network speeds are displayed in MB/s by default.'
      }
    },
    {
      type: 'system-processes' as const,
      name: 'Processes',
      description: 'Top running processes',
      icon: this.faListCheck,
      iconType: 'fontawesome' as const,
      configComponent: null,
      defaults: {
        title: 'System Processes',
        layoutW: 3,
        layoutH: 6,
        layoutMinW: 3,
        layoutMinH: 6,
        layoutMaxW: 3,
        layoutMaxH: 6
      },
      info: {
        title: 'Processes Widget',
        description: 'Shows the top 10 running processes sorted by CPU usage. Displays process name, PID, CPU%, and memory usage in real-time.',
        tip: 'Hover over a process to see the full command.'
      }
    },
    {
      type: 'plex' as const,
      name: 'Plex',
      description: 'Now playing and recent media',
      icon: this.plexIconUrl,
      iconType: 'computed' as const,
      configComponent: PlexWidgetFormComponent,
      defaults: {
        title: 'Plex Media Server',
        layoutW: 3,
        layoutH: 7,
        layoutMinW: 3,
        layoutMinH: 7
      },
      info: {
        title: 'Plex Widget',
        description: 'Compact widget showing library stats (movies/TV shows), the first active session with artwork, and 10 most recent additions with scrolling. Updates every 10 seconds.',
        tip: 'Additional active sessions are shown as "+N more sessions" to keep the widget small.'
      }
    },
    {
      type: 'jellyfin' as const,
      name: 'Jellyfin',
      description: 'Now playing and recent media',
      icon: this.jellyfinIconUrl,
      iconType: 'computed' as const,
      configComponent: JellyfinWidgetFormComponent,
      defaults: {
        title: 'Jellyfin Media Server',
        layoutW: 3,
        layoutH: 7,
        layoutMinW: 3,
        layoutMinH: 7
      },
      info: {
        title: 'Jellyfin Widget',
        description: 'Compact widget showing library stats (movies/TV shows/music), the first active session with artwork, and 10 most recent additions with scrolling. Updates every 10 seconds.',
        tip: 'Additional active sessions are shown as "+N more sessions" to keep the widget small.'
      }
    }
  ];

  // Filtered widgets based on search
  filteredWidgets = computed(() => {
    const query = this.widgetSearchQuery().toLowerCase().trim();
    if (!query) return this.availableWidgets;

    return this.availableWidgets.filter(widget =>
      widget.name.toLowerCase().includes(query) ||
      widget.description.toLowerCase().includes(query)
    );
  });

  // Get the configuration component for the currently selected widget
  selectedWidgetConfig = computed(() => {
    const widget = this.availableWidgets.find(w => w.type === this.widgetType());
    return widget?.configComponent || null;
  });

  // Get the info for the currently selected widget
  selectedWidgetInfo = computed(() => {
    const widget = this.availableWidgets.find(w => w.type === this.widgetType());
    return widget?.info || null;
  });

  // Get the entire selected widget definition
  selectedWidget = computed(() => {
    return this.availableWidgets.find(w => w.type === this.widgetType()) || null;
  });

  // Icon catalog
  categories = signal<IconCategory[]>([]);
  selectedCategory = signal<string | null>(null);
  filteredIcons = signal<IconCatalogEntry[]>([]);

  // Limit icons displayed for performance
  private readonly MAX_ICONS_DISPLAYED = 100;
  displayedIcons = computed(() => {
    const icons = this.filteredIcons();
    return icons.slice(0, this.MAX_ICONS_DISPLAYED);
  });

  hasMoreIcons = computed(() => {
    return this.filteredIcons().length > this.MAX_ICONS_DISPLAYED;
  });

  // Search debouncing
  private searchSubject = new Subject<string>();

  // Edit mode
  editingCard = this.addCardModal.editingCard;
  isEditMode = computed(() => this.editingCard() !== null);
  modalTitle = computed(() => this.isEditMode() ? 'Edit Card' : 'Add New Card');

  constructor() {
    // Populate form fields when editingCard changes
    effect(() => {
      const card = this.editingCard();
      if (card) {
        this.title.set(card.title);
        this.subtitle.set(card.subtitle || '');

        // Extract URL from meta
        try {
          const meta = typeof card.meta === 'string' ? JSON.parse(card.meta) : card.meta;
          this.url.set(meta?.url || '');
        } catch {
          this.url.set('');
        }

        // Set icon source and selection
        if (card.iconSource === 'catalog' && card.iconCatalogId) {
          this.iconSource.set('catalog');
          this.selectedIconId.set(card.iconCatalogId);
        } else if (card.iconCustomUrl) {
          this.iconSource.set('custom');
          this.customIconUrl.set(card.iconCustomUrl);
          this.selectedIconId.set(null);
        }
      } else {
        // Reset form for create mode
        this.resetForm();
      }
    });

    // Clear selected widget if it's filtered out by search
    effect(() => {
      const filtered = this.filteredWidgets();
      const currentWidget = this.widgetType();

      // If current widget is not in filtered list, reset to first widget
      if (this.isWidgetCard() && !filtered.find(w => w.type === currentWidget)) {
        if (filtered.length > 0) {
          this.widgetType.set(filtered[0].type);
        }
      }
    });
  }

  ngOnInit(): void {
    this.iconCatalog.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);

        // Default to first category
        if (cats.length > 0) {
          this.selectedCategory.set(cats[0].id);
          this.filteredIcons.set(cats[0].icons);
        }
      }
    });

    // Set up debounced search
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged() // Only emit if value changed
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    const category = this.categories().find(c => c.id === categoryId);
    if (category) {
      this.filteredIcons.set(category.icons);
    }
    this.iconSearchQuery.set('');
  }

  searchIcons(query: string): void {
    this.iconSearchQuery.set(query);
    this.searchSubject.next(query);
  }

  private performSearch(query: string): void {
    if (!query.trim()) {
      // Reset to selected category
      const category = this.categories().find(c => c.id === this.selectedCategory());
      if (category) {
        this.filteredIcons.set(category.icons);
      }
    } else {
      // Search across all icons
      this.iconCatalog.searchIcons(query).subscribe({
        next: (results) => {
          this.filteredIcons.set(results);
        }
      });
    }
  }

  selectIcon(iconId: string): void {
    this.selectedIconId.set(iconId);
    this.iconSource.set('catalog');
  }

  setCustomIcon(): void {
    this.iconSource.set('custom');
    this.selectedIconId.set(null);
  }

  getSelectedIcon(): IconCatalogEntry | undefined {
    const id = this.selectedIconId();
    return id ? this.iconCatalog.getIconById(id) : undefined;
  }

  getIconUrl(icon: IconCatalogEntry): string {
    const themeVariant = this.themeService.themeVariant();
    return this.iconCatalog.getIconForThemeVariant(icon.id, themeVariant) || icon.iconUrl;
  }

  resetForm(): void {
    this.cardType.set('regular');
    this.widgetType.set('note');
    this.title.set('');
    this.subtitle.set('');
    this.url.set('');
    this.iconSource.set('catalog');
    this.selectedIconId.set(null);
    this.customIconUrl.set('');
    this.iconSearchQuery.set('');
  }

  isRegularCard(): boolean {
    return this.cardType() === 'regular';
  }

  isWidgetCard(): boolean {
    return this.cardType() === 'widget';
  }

  async handleSubmit(): Promise<void> {
    // Only require title for regular cards
    if (this.isRegularCard() && !this.title().trim()) {
      alert('Please enter a title');
      return;
    }

    // Validate widget form fields using form component validation
    if (this.isWidgetCard() && this.widgetFormComponent) {
      if (!this.widgetFormComponent.validate()) {
        alert('Please fill in all required widget configuration fields');
        return;
      }
    }

    const cardData: any = {};

    // Handle widget cards
    if (this.isWidgetCard()) {
      // Get widget definition
      const widget = this.availableWidgets.find(w => w.type === this.widgetType());
      if (!widget) {
        alert('Unknown widget type');
        return;
      }

      // Apply default properties from widget definition
      Object.assign(cardData, widget.defaults);

      // Handle special cases
      if (this.widgetType() === 'clock') {
        // Analog clocks need different layout dimensions
        const clockData = this.widgetFormComponent?.getData();
        if (clockData?.style === 'analog') {
          cardData.layoutW = 2;
          cardData.layoutH = 3;
          cardData.layoutMinW = 2;
          cardData.layoutMinH = 3;
        }
      } else if (this.widgetType() === 'rss') {
        // RSS widget title comes from form data
        const rssData = this.widgetFormComponent?.getData();
        cardData.title = rssData?.widgetName || widget.defaults.title;
      }

      cardData.iconSource = 'catalog';

      // Build widget config based on type
      let widgetConfig: any = {};
      if (this.widgetType() === 'note') {
        widgetConfig.content = '<p>Start writing your notes here...</p>';
      } else if (this.widgetType() === 'plex') {
        const plexData = this.widgetFormComponent?.getData();
        if (!plexData) {
          alert('Unable to get Plex configuration');
          return;
        }

        // Create Plex credential and use its ID
        try {
          const credentialResponse = await firstValueFrom(
            this.http.post<{ credential: any }>('/api/credentials', {
              name: `Plex Server - ${new Date().toLocaleDateString()}`,
              serviceType: 'plex',
              data: {
                serverUrl: plexData.serverUrl,
                token: plexData.token
              },
              metadata: {
                createdBy: 'add-card-modal'
              }
            })
          );

          if (!credentialResponse.credential) {
            alert('Failed to store Plex credentials securely');
            return;
          }

          widgetConfig.serverUrl = plexData.serverUrl;
          widgetConfig.credentialId = credentialResponse.credential.id;
          widgetConfig.showNowPlaying = true;
          widgetConfig.showRecent = true;
          widgetConfig.recentLimit = 10;
          widgetConfig.refreshInterval = 10;
        } catch (error) {
          console.error('Failed to create Plex credential:', error);
          alert('Failed to store Plex credentials securely. Please try again.');
          return;
        }
      } else if (this.widgetType() === 'jellyfin') {
        const jellyfinData = this.widgetFormComponent?.getData();
        if (!jellyfinData) {
          alert('Unable to get Jellyfin configuration');
          return;
        }

        // Create Jellyfin credential and use its ID
        try {
          const credentialResponse = await firstValueFrom(
            this.http.post<{ credential: any }>('/api/credentials', {
              name: `Jellyfin Server - ${new Date().toLocaleDateString()}`,
              serviceType: 'jellyfin',
              data: {
                serverUrl: jellyfinData.serverUrl,
                apiKey: jellyfinData.apiKey
              },
              metadata: {
                createdBy: 'add-card-modal'
              }
            })
          );

          if (!credentialResponse.credential) {
            alert('Failed to store Jellyfin credentials securely');
            return;
          }

          widgetConfig.serverUrl = jellyfinData.serverUrl;
          widgetConfig.credentialId = credentialResponse.credential.id;
          widgetConfig.showNowPlaying = true;
          widgetConfig.showRecent = true;
          widgetConfig.recentLimit = 10;
          widgetConfig.refreshInterval = 10;
        } catch (error) {
          console.error('Failed to create Jellyfin credential:', error);
          alert('Failed to store Jellyfin credentials securely. Please try again.');
          return;
        }
      } else if (this.widgetType() === 'clock') {
        const clockData = this.widgetFormComponent?.getData();
        if (clockData) {
          widgetConfig = { ...widgetConfig, ...clockData };
        }
      } else if (this.widgetType() === 'rss') {
        const rssData = this.widgetFormComponent?.getData();
        if (rssData) {
          widgetConfig = {
            ...widgetConfig,
            ...rssData,
            refreshInterval: 300 // 5 minutes default
          };
        }
      } else if (this.widgetType() === 'calendar') {
        const calendarData = this.widgetFormComponent?.getData();
        if (!calendarData) {
          alert('Unable to get Calendar configuration');
          return;
        }

        // Build calendar source configuration
        const source: any = {
          id: `source-${Date.now()}`,
          type: calendarData.sourceType,
          name: calendarData.sourceName,
          color: calendarData.sourceColor,
          enabled: true
        };

        if (calendarData.sourceType === 'ics') {
          source.icsConfig = {
            feedUrl: calendarData.icsFeedUrl
          };
        } else if (calendarData.sourceType === 'caldav') {
          // Create CalDAV credential and use its ID
          try {
            const credentialResponse = await firstValueFrom(
              this.http.post<{ credential: any }>('/api/credentials', {
                name: `CalDAV - ${calendarData.sourceName} - ${new Date().toLocaleDateString()}`,
                serviceType: 'caldav',
                data: {
                  serverUrl: calendarData.caldavServerUrl,
                  username: calendarData.caldavUsername,
                  password: calendarData.caldavPassword
                },
                metadata: {
                  createdBy: 'add-card-modal',
                  calendarName: calendarData.sourceName
                }
              })
            );

            if (!credentialResponse.credential) {
              alert('Failed to store CalDAV credentials securely');
              return;
            }

            source.caldavConfig = {
              credentialId: credentialResponse.credential.id
            };
          } catch (error) {
            console.error('Failed to create CalDAV credential:', error);
            alert('Failed to store CalDAV credentials securely. Please try again.');
            return;
          }
        }

        widgetConfig.sources = [source];
        widgetConfig.defaultView = 'dayGridMonth';
        widgetConfig.refreshInterval = 300; // 5 minutes default
        widgetConfig.showWeekNumbers = false;
        widgetConfig.firstDayOfWeek = 0; // Sunday
      }

      cardData.widgets = [{
        type: this.widgetType(),
        config: widgetConfig
      }];

      // Widget cards don't need icons, URLs, or titles
    } else {
      // Regular card - add title and other fields
      cardData.title = this.title();
      cardData.subtitle = this.subtitle() || undefined;
      cardData.iconSource = this.iconSource();

      // Handle meta field (URL)
      if (this.url()) {
        cardData.meta = { url: this.url() };
      }

      if (this.iconSource() === 'catalog' && this.selectedIconId()) {
        cardData.iconCatalogId = this.selectedIconId();
        // Use theme-aware icon variant
        const themeVariant = this.themeService.themeVariant();
        const iconUrl = this.iconCatalog.getIconForThemeVariant(this.selectedIconId()!, themeVariant);
        if (iconUrl) {
          cardData.iconCustomUrl = iconUrl;
        }
      } else if (this.iconSource() === 'custom' && this.customIconUrl()) {
        cardData.iconCustomUrl = this.customIconUrl();
      }
    }

    if (this.isEditMode()) {
      // Update existing card
      const card = this.editingCard();
      if (card) {
        this.cardService.updateCard(card.id, cardData).subscribe({
          next: () => {
            // Emit event BEFORE closing so editingCard is still set
            this.cardCreated.emit(cardData);
            this.addCardModal.close();
          },
          error: (err) => {
            console.error('Failed to update card:', err);
            alert('Failed to update card. Please try again.');
          }
        });
      }
    } else {
      // Create new card - emit data for parent to handle
      this.cardCreated.emit(cardData);
    }
  }

  handleCancel(): void {
    this.cancelled.emit();
  }
}
