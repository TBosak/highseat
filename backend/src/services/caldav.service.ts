import { createDAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';

export interface CalDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  allDay?: boolean;
  color?: string;
  calendarName?: string;
}

/**
 * CalDAV service for fetching calendar events from CalDAV servers
 */
export class CalDAVService {
  private config: CalDAVConfig;

  constructor(config: CalDAVConfig) {
    this.config = config;
  }

  /**
   * Fetch events from CalDAV server
   * @param startDate - Start date for event range
   * @param endDate - End date for event range
   * @returns Array of calendar events
   */
  async fetchEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      console.log(`[CalDAV] Connecting to ${this.config.serverUrl}...`);

      // Create DAV client
      const client = await createDAVClient({
        serverUrl: this.config.serverUrl,
        credentials: {
          username: this.config.username,
          password: this.config.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });

      console.log('[CalDAV] Fetching calendars...');

      // Fetch calendars
      const calendars = await client.fetchCalendars();

      console.log(`[CalDAV] Found ${calendars.length} calendar(s)`);

      // Fetch events from all calendars
      const allEvents: CalendarEvent[] = [];

      for (const calendar of calendars) {
        try {
          const calendarObjects = await client.fetchCalendarObjects({
            calendar: calendar,
            timeRange: startDate && endDate ? {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            } : undefined,
          });

          console.log(`[CalDAV] Found ${calendarObjects.length} event(s) in calendar: ${calendar.displayName}`);

          // Parse calendar objects and extract events
          const events = this.parseCalendarObjects(calendarObjects, calendar);
          allEvents.push(...events);
        } catch (error) {
          console.error(`[CalDAV] Error fetching events from calendar ${calendar.displayName}:`, error);
        }
      }

      console.log(`[CalDAV] Total events fetched: ${allEvents.length}`);

      return allEvents;
    } catch (error) {
      console.error('[CalDAV] Error fetching events:', error);
      throw new Error(`Failed to fetch CalDAV events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse calendar objects and extract event data
   */
  private parseCalendarObjects(
    calendarObjects: DAVCalendarObject[],
    calendar: DAVCalendar
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    for (const obj of calendarObjects) {
      try {
        // Parse iCalendar data
        const icalData = obj.data;
        if (!icalData) continue;

        // Extract VEVENT components
        const vevents = this.extractVEvents(icalData);

        for (const vevent of vevents) {
          const event = this.parseVEvent(vevent, calendar.displayName);
          if (event) {
            events.push(event);
          }
        }
      } catch (error) {
        console.error('[CalDAV] Error parsing calendar object:', error);
      }
    }

    return events;
  }

  /**
   * Extract VEVENT components from iCalendar data
   */
  private extractVEvents(icalData: string): string[] {
    const vevents: string[] = [];
    const lines = icalData.split('\n');

    let currentEvent: string[] = [];
    let inEvent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = [trimmedLine];
      } else if (trimmedLine === 'END:VEVENT') {
        currentEvent.push(trimmedLine);
        vevents.push(currentEvent.join('\n'));
        currentEvent = [];
        inEvent = false;
      } else if (inEvent) {
        currentEvent.push(trimmedLine);
      }
    }

    return vevents;
  }

  /**
   * Parse a VEVENT component into a CalendarEvent
   */
  private parseVEvent(vevent: string, calendarName?: string): CalendarEvent | null {
    const lines = vevent.split('\n');
    const event: Partial<CalendarEvent> = {
      calendarName,
    };

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('UID:')) {
        event.id = trimmedLine.substring(4);
      } else if (trimmedLine.startsWith('SUMMARY:')) {
        event.title = trimmedLine.substring(8);
      } else if (trimmedLine.startsWith('DTSTART')) {
        const dateValue = this.extractDateValue(trimmedLine);
        if (dateValue) {
          event.start = dateValue.toISOString();
          // Check if it's an all-day event (DATE value type)
          if (trimmedLine.includes('VALUE=DATE')) {
            event.allDay = true;
          }
        }
      } else if (trimmedLine.startsWith('DTEND')) {
        const dateValue = this.extractDateValue(trimmedLine);
        if (dateValue) {
          event.end = dateValue.toISOString();
        }
      } else if (trimmedLine.startsWith('DESCRIPTION:')) {
        event.description = trimmedLine.substring(12).replace(/\\n/g, '\n');
      } else if (trimmedLine.startsWith('LOCATION:')) {
        event.location = trimmedLine.substring(9);
      }
    }

    // Validate required fields
    if (!event.id || !event.title || !event.start) {
      return null;
    }

    // If no end date, use start date
    if (!event.end) {
      event.end = event.start;
    }

    return event as CalendarEvent;
  }

  /**
   * Extract date value from iCalendar property
   */
  private extractDateValue(line: string): Date | null {
    try {
      // Extract the date/datetime value after the colon
      const colonIndex = line.lastIndexOf(':');
      if (colonIndex === -1) return null;

      const dateStr = line.substring(colonIndex + 1);

      // Check if it's a DATE-TIME or DATE value
      if (dateStr.includes('T')) {
        // DateTime format: 20231225T120000Z or 20231225T120000
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const hour = parseInt(dateStr.substring(9, 11));
        const minute = parseInt(dateStr.substring(11, 13));
        const second = parseInt(dateStr.substring(13, 15));

        if (dateStr.endsWith('Z')) {
          // UTC time
          return new Date(Date.UTC(year, month, day, hour, minute, second));
        } else {
          // Local time (we'll treat as UTC for simplicity)
          return new Date(Date.UTC(year, month, day, hour, minute, second));
        }
      } else {
        // Date format: 20231225 (all-day event)
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(Date.UTC(year, month, day, 0, 0, 0));
      }
    } catch (error) {
      console.error('[CalDAV] Error parsing date:', error);
      return null;
    }
  }

  /**
   * Test connection to CalDAV server
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await createDAVClient({
        serverUrl: this.config.serverUrl,
        credentials: {
          username: this.config.username,
          password: this.config.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });

      const calendars = await client.fetchCalendars();
      console.log(`[CalDAV] Connection successful. Found ${calendars.length} calendar(s)`);
      return true;
    } catch (error) {
      console.error('[CalDAV] Connection test failed:', error);
      return false;
    }
  }
}
