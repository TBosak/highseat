import ical from 'ical';
import type { CalendarEvent } from './caldav.service';

export interface ICSFeedConfig {
  feedUrl: string;
  name?: string;
  color?: string;
}

/**
 * ICS Feed service for parsing iCalendar feeds
 */
export class ICSFeedService {
  private config: ICSFeedConfig;

  constructor(config: ICSFeedConfig) {
    this.config = config;
  }

  /**
   * Fetch and parse events from ICS feed
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Array of calendar events
   */
  async fetchEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      console.log(`[ICS] Fetching feed from ${this.config.feedUrl}...`);

      // Fetch ICS feed
      const response = await fetch(this.config.feedUrl, {
        headers: {
          'User-Agent': 'Highseat Dashboard Calendar Widget/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const icsData = await response.text();

      console.log('[ICS] Parsing calendar data...');

      // Parse ICS data
      const parsedData = ical.parseICS(icsData);

      const events: CalendarEvent[] = [];

      // Convert parsed events to our format
      for (const [key, event] of Object.entries(parsedData)) {
        if (event.type !== 'VEVENT') continue;

        try {
          const calendarEvent = this.convertToCalendarEvent(event);
          if (!calendarEvent) continue;

          // Apply date filtering if specified
          if (startDate && endDate) {
            const eventStart = new Date(calendarEvent.start);
            const eventEnd = new Date(calendarEvent.end);

            if (eventEnd < startDate || eventStart > endDate) {
              continue; // Event outside date range
            }
          }

          events.push(calendarEvent);
        } catch (error) {
          console.error(`[ICS] Error converting event ${key}:`, error);
        }
      }

      console.log(`[ICS] Parsed ${events.length} event(s) from feed`);

      return events;
    } catch (error) {
      console.error('[ICS] Error fetching ICS feed:', error);
      throw new Error(`Failed to fetch ICS feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert ical event to CalendarEvent format
   */
  private convertToCalendarEvent(event: any): CalendarEvent | null {
    try {
      // Validate required fields
      if (!event.uid || !event.summary || !event.start) {
        return null;
      }

      const calendarEvent: CalendarEvent = {
        id: event.uid,
        title: event.summary,
        start: event.start instanceof Date ? event.start.toISOString() : new Date(event.start).toISOString(),
        end: event.end
          ? (event.end instanceof Date ? event.end.toISOString() : new Date(event.end).toISOString())
          : (event.start instanceof Date ? event.start.toISOString() : new Date(event.start).toISOString()),
        description: event.description,
        location: event.location,
        calendarName: this.config.name,
        color: this.config.color,
      };

      // Detect all-day events
      if (event.start instanceof Date && event.end instanceof Date) {
        const startTime = event.start.getHours() * 60 + event.start.getMinutes();
        const endTime = event.end.getHours() * 60 + event.end.getMinutes();

        // If both times are midnight, it's likely an all-day event
        if (startTime === 0 && endTime === 0) {
          calendarEvent.allDay = true;
        }
      }

      // Check for datetype property (some ICS parsers set this)
      if (event.datetype === 'date' || event.start?.dateOnly) {
        calendarEvent.allDay = true;
      }

      return calendarEvent;
    } catch (error) {
      console.error('[ICS] Error converting event:', error);
      return null;
    }
  }

  /**
   * Test if ICS feed is accessible and valid
   */
  async testFeed(): Promise<boolean> {
    try {
      const response = await fetch(this.config.feedUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Highseat Dashboard Calendar Widget/1.0',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[ICS] Feed test failed:', error);
      return false;
    }
  }
}

/**
 * Fetch events from ICS feed URL
 * @param feedUrl - URL of the ICS feed
 * @param name - Optional name for the calendar
 * @param color - Optional color for events
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns Array of calendar events
 */
export async function fetchICSFeed(
  feedUrl: string,
  name?: string,
  color?: string,
  startDate?: Date,
  endDate?: Date
): Promise<CalendarEvent[]> {
  const service = new ICSFeedService({ feedUrl, name, color });
  return service.fetchEvents(startDate, endDate);
}

/**
 * Test if ICS feed URL is valid and accessible
 * @param feedUrl - URL of the ICS feed
 * @returns True if feed is accessible
 */
export async function testICSFeed(feedUrl: string): Promise<boolean> {
  const service = new ICSFeedService({ feedUrl });
  return service.testFeed();
}
