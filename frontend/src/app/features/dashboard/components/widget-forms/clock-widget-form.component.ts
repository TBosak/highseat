import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { WidgetFormComponent } from './widget-form.interface';

export interface ClockWidgetFormData {
  format: '12h' | '24h';
  showSeconds: boolean;
  showDate: boolean;
  style: 'digital' | 'analog';
}

@Component({
  selector: 'app-clock-widget-form',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  styleUrls: ['./_widget-forms-shared.scss'],
  template: `
    <div class="form-group">
      <label>Clock Style</label>
      <div class="clock-style-selector">
        <button
          type="button"
          class="style-option"
          [class.active]="style() === 'digital'"
          (click)="handleStyleChange('digital')"
        >
          <fa-icon [icon]="faClock"></fa-icon>
          <span>Digital</span>
        </button>
        <button
          type="button"
          class="style-option"
          [class.active]="style() === 'analog'"
          (click)="handleStyleChange('analog')"
        >
          <fa-icon [icon]="faClock"></fa-icon>
          <span>Analog</span>
        </button>
      </div>
    </div>

    @if (style() === 'digital') {
      <div class="form-group">
        <label>Time Format</label>
        <div class="clock-format-selector">
          <button
            type="button"
            class="format-option"
            [class.active]="format() === '12h'"
            (click)="handleFormatChange('12h')"
          >
            <span>12-hour</span>
          </button>
          <button
            type="button"
            class="format-option"
            [class.active]="format() === '24h'"
            (click)="handleFormatChange('24h')"
          >
            <span>24-hour</span>
          </button>
        </div>
      </div>
    }

    <div class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          [checked]="showSeconds()"
          (change)="handleShowSecondsChange($any($event.target).checked)"
        />
        <span>Show seconds</span>
      </label>
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          [checked]="showDate()"
          (change)="handleShowDateChange($any($event.target).checked)"
        />
        <span>Show date</span>
      </label>
    </div>
  `
})
export class ClockWidgetFormComponent implements WidgetFormComponent {
  faClock = faClock;

  format = signal<'12h' | '24h'>('24h');
  showSeconds = signal(true);
  showDate = signal(true);
  style = signal<'digital' | 'analog'>('digital');

  @Output() dataChange = new EventEmitter<ClockWidgetFormData>();

  handleFormatChange(value: '12h' | '24h'): void {
    this.format.set(value);
    this.emitData();
  }

  handleShowSecondsChange(checked: boolean): void {
    this.showSeconds.set(checked);
    this.emitData();
  }

  handleShowDateChange(checked: boolean): void {
    this.showDate.set(checked);
    this.emitData();
  }

  handleStyleChange(value: 'digital' | 'analog'): void {
    this.style.set(value);
    // Analog clocks are always 12-hour format
    if (value === 'analog') {
      this.format.set('12h');
    }
    this.emitData();
  }

  private emitData(): void {
    this.dataChange.emit({
      format: this.format(),
      showSeconds: this.showSeconds(),
      showDate: this.showDate(),
      style: this.style()
    });
  }

  validate(): boolean {
    return true; // Clock widget has no required fields
  }

  getData(): ClockWidgetFormData {
    return {
      format: this.format(),
      showSeconds: this.showSeconds(),
      showDate: this.showDate(),
      style: this.style()
    };
  }
}
