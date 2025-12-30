import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { WidgetFormComponent } from './widget-form.interface';

export interface CalendarWidgetFormData {
  sourceType: 'ics' | 'caldav';
  sourceName: string;
  sourceColor: string;
  icsFeedUrl?: string;
  caldavServerUrl?: string;
  caldavUsername?: string;
  caldavPassword?: string;
}

@Component({
  selector: 'app-calendar-widget-form',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  styleUrls: ['./_widget-forms-shared.scss'],
  template: `
    <div class="form-group">
      <label for="calendarSourceName">Calendar Name *</label>
      <input
        id="calendarSourceName"
        type="text"
        [value]="sourceName()"
        (input)="handleSourceNameChange($any($event.target).value)"
        placeholder="e.g. Personal, Work, Holidays"
        required
      />
      <small class="input-hint">A display name for this calendar</small>
    </div>

    <div class="form-group">
      <label for="calendarSourceColor">Calendar Color</label>
      <input
        id="calendarSourceColor"
        type="color"
        [value]="sourceColor()"
        (input)="handleSourceColorChange($any($event.target).value)"
      />
      <small class="input-hint">Color for events from this calendar</small>
    </div>

    <div class="form-group">
      <label>Calendar Source Type *</label>
      <div class="radio-group">
        <label class="radio-label">
          <input
            type="radio"
            name="calendarSourceType"
            [checked]="sourceType() === 'ics'"
            (change)="handleSourceTypeChange('ics')"
          />
          <span>ICS Feed</span>
        </label>
        <label class="radio-label disabled">
          <input
            type="radio"
            name="calendarSourceType"
            [checked]="sourceType() === 'caldav'"
            disabled
          />
          <span>CalDAV <small>(Coming Soon)</small></span>
        </label>
      </div>
      <small class="input-hint">CalDAV support is not yet implemented. Use ICS feeds for now.</small>
    </div>

    @if (sourceType() === 'ics') {
      <div class="form-group">
        <label for="calendarIcsFeedUrl">ICS Feed URL *</label>
        <div class="input-with-icon">
          <fa-icon [icon]="faLink" class="input-icon"></fa-icon>
          <input
            id="calendarIcsFeedUrl"
            type="url"
            [value]="icsFeedUrl()"
            (input)="handleIcsFeedUrlChange($any($event.target).value)"
            placeholder="https://calendar.google.com/calendar/ical/..."
            required
          />
        </div>
        <small class="input-hint">URL of the ICS/iCal calendar feed</small>
      </div>
    }
  `
})
export class CalendarWidgetFormComponent implements WidgetFormComponent {
  faLink = faLink;

  sourceType = signal<'ics' | 'caldav'>('ics');
  sourceName = signal('');
  sourceColor = signal('#3788d8');
  icsFeedUrl = signal('');
  caldavServerUrl = signal('');
  caldavUsername = signal('');
  caldavPassword = signal('');

  @Output() dataChange = new EventEmitter<CalendarWidgetFormData>();

  handleSourceNameChange(value: string): void {
    this.sourceName.set(value);
    this.emitData();
  }

  handleSourceColorChange(value: string): void {
    this.sourceColor.set(value);
    this.emitData();
  }

  handleSourceTypeChange(type: 'ics' | 'caldav'): void {
    this.sourceType.set(type);
    this.emitData();
  }

  handleIcsFeedUrlChange(value: string): void {
    this.icsFeedUrl.set(value);
    this.emitData();
  }

  private emitData(): void {
    this.dataChange.emit({
      sourceType: this.sourceType(),
      sourceName: this.sourceName(),
      sourceColor: this.sourceColor(),
      icsFeedUrl: this.icsFeedUrl(),
      caldavServerUrl: this.caldavServerUrl(),
      caldavUsername: this.caldavUsername(),
      caldavPassword: this.caldavPassword()
    });
  }

  validate(): boolean {
    if (!this.sourceName().trim()) return false;
    if (this.sourceType() === 'ics' && !this.icsFeedUrl().trim()) return false;
    return true;
  }

  getData(): CalendarWidgetFormData {
    return {
      sourceType: this.sourceType(),
      sourceName: this.sourceName(),
      sourceColor: this.sourceColor(),
      icsFeedUrl: this.icsFeedUrl(),
      caldavServerUrl: this.caldavServerUrl(),
      caldavUsername: this.caldavUsername(),
      caldavPassword: this.caldavPassword()
    };
  }
}
