import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription, forkJoin } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar, faSpinner, faRefresh } from '@fortawesome/free-solid-svg-icons';
import type { CalendarWidgetConfig, CalendarEvent, CalendarSource } from '../../../core/models';

@Component({
  selector: 'app-calendar-widget',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, FontAwesomeModule],
  templateUrl: './calendar-widget.component.html',
  styleUrls: ['./calendar-widget.component.scss']
})
export class CalendarWidgetComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private subscription?: Subscription;

  @Input() config!: CalendarWidgetConfig;

  faCalendar = faCalendar;
  faSpinner = faSpinner;
  faRefresh = faRefresh;

  events = signal<CalendarEvent[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedEvent = signal<any>(null);

  calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,dayGridDay'
    },
    events: [],
    eventClick: this.handleEventClick.bind(this),
    dateClick: this.handleDateClick.bind(this),
    height: 'auto',
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      meridiem: false
    }
  });

  ngOnInit(): void {
    if (!this.config.sources || this.config.sources.length === 0) {
      this.error.set('No calendar sources configured');
      this.loading.set(false);
      return;
    }

    // Apply user configuration
    const options = this.calendarOptions();
    if (this.config.defaultView) {
      options.initialView = this.config.defaultView;
    }
    if (this.config.showWeekNumbers) {
      options.weekNumbers = true;
    }
    if (this.config.firstDayOfWeek !== undefined) {
      options.firstDay = this.config.firstDayOfWeek;
    }

    const refreshInterval = (this.config.refreshInterval || 300) * 1000; // Default 5 minutes

    this.subscription = interval(refreshInterval)
      .pipe(
        startWith(0), // Fetch immediately on init
        switchMap(() => this.fetchAllEvents()),
        catchError((err) => {
          console.error('[Calendar Widget] Error fetching events:', err);
          this.error.set('Failed to fetch calendar events');
          this.loading.set(false);
          return [];
        })
      )
      .subscribe({
        next: (events) => {
          this.events.set(events);
          this.updateCalendarEvents(events);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          console.error('[Calendar Widget] Subscription error:', err);
          this.error.set('Failed to fetch calendar events');
          this.loading.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Fetch events from all configured calendar sources
   */
  private fetchAllEvents() {
    const enabledSources = this.config.sources.filter(source => source.enabled !== false);

    if (enabledSources.length === 0) {
      return Promise.resolve([]);
    }

    // Calculate date range (1 month before and 2 months after current date)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);

    const requests = enabledSources.map(source => this.fetchEventsFromSource(source, startDate, endDate));

    return forkJoin(requests).toPromise().then((results) => {
      // Flatten and combine all events
      const allEvents: CalendarEvent[] = [];
      if (results) {
        for (const result of results) {
          if (result && Array.isArray(result)) {
            allEvents.push(...result);
          }
        }
      }
      return allEvents;
    });
  }

  /**
   * Fetch events from a single calendar source
   */
  private fetchEventsFromSource(source: CalendarSource, startDate: Date, endDate: Date) {
    if (source.type === 'caldav' && source.caldavConfig) {
      return this.http.post<{ success: boolean; events: CalendarEvent[] }>('/api/calendar/caldav/fetch', {
        credentialId: source.caldavConfig.credentialId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }).toPromise().then((response) => {
        if (response && response.success) {
          // Apply source color and name to events
          return response.events.map(event => ({
            ...event,
            color: source.color || event.color,
            calendarName: source.name
          }));
        }
        return [];
      }).catch((err) => {
        console.error(`[Calendar Widget] Error fetching from ${source.name}:`, err);
        return [];
      });
    } else if (source.type === 'ics' && source.icsConfig) {
      return this.http.post<{ success: boolean; events: CalendarEvent[] }>('/api/calendar/ics/fetch', {
        feedUrl: source.icsConfig.feedUrl,
        name: source.name,
        color: source.color,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }).toPromise().then((response) => {
        if (response && response.success) {
          return response.events;
        }
        return [];
      }).catch((err) => {
        console.error(`[Calendar Widget] Error fetching from ${source.name}:`, err);
        return [];
      });
    }

    return Promise.resolve([]);
  }

  /**
   * Update FullCalendar with new events
   */
  private updateCalendarEvents(events: CalendarEvent[]) {
    const calendarEvents: EventInput[] = events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      backgroundColor: event.color,
      borderColor: event.color,
      extendedProps: {
        description: event.description,
        location: event.location,
        calendarName: event.calendarName
      }
    }));

    this.calendarOptions.update(options => ({
      ...options,
      events: calendarEvents
    }));
  }

  /**
   * Handle event click
   */
  handleEventClick(info: any): void {
    this.selectedEvent.set(info.event);
  }

  /**
   * Close event details modal
   */
  closeEventModal(): void {
    this.selectedEvent.set(null);
  }

  /**
   * Format event date for display
   */
  formatEventDate(date: Date | string): string {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString();
  }

  /**
   * Handle date click (for future event creation)
   */
  handleDateClick(info: any): void {
    console.log('[Calendar Widget] Date clicked:', info.dateStr);
    // Future: Implement event creation
  }

  /**
   * Manually refresh calendar events
   */
  refresh(): void {
    this.loading.set(true);
    this.fetchAllEvents().then((events) => {
      this.events.set(events);
      this.updateCalendarEvents(events);
      this.loading.set(false);
      this.error.set(null);
    }).catch((err) => {
      console.error('[Calendar Widget] Refresh error:', err);
      this.error.set('Failed to refresh calendar');
      this.loading.set(false);
    });
  }
}
