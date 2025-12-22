import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';

export interface ClockWidgetConfig {
  format: '12h' | '24h';
  showSeconds: boolean;
  showDate: boolean;
  timezone?: string; // e.g., 'America/New_York', defaults to local
  style: 'digital' | 'analog';
}

@Component({
  selector: 'app-clock-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clock-widget.component.html',
  styleUrls: ['./clock-widget.component.scss']
})
export class ClockWidgetComponent implements OnInit, OnDestroy {
  @Input() config: ClockWidgetConfig = {
    format: '24h',
    showSeconds: true,
    showDate: true,
    style: 'digital'
  };

  private subscription?: Subscription;
  currentTime = signal(new Date());

  // Computed values for display
  timeString = computed(() => {
    const time = this.currentTime();
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: this.config.format === '12h',
      timeZone: this.config.timezone
    };

    if (this.config.showSeconds) {
      options.second = '2-digit';
    }

    return time.toLocaleTimeString('en-US', options);
  });

  dateString = computed(() => {
    const time = this.currentTime();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: this.config.timezone
    };

    return time.toLocaleDateString('en-US', options);
  });

  // For analog clock
  hourRotation = computed(() => {
    const time = this.currentTime();
    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    return (hours * 30) + (minutes * 0.5); // 30 degrees per hour + 0.5 degrees per minute
  });

  minuteRotation = computed(() => {
    const time = this.currentTime();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    return (minutes * 6) + (seconds * 0.1); // 6 degrees per minute + 0.1 degrees per second
  });

  secondRotation = computed(() => {
    const time = this.currentTime();
    const seconds = time.getSeconds();
    return seconds * 6; // 6 degrees per second
  });

  ngOnInit(): void {
    // Update every second
    this.subscription = interval(1000).subscribe(() => {
      this.currentTime.set(new Date());
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  isDigital(): boolean {
    return this.config.style === 'digital';
  }

  isAnalog(): boolean {
    return this.config.style === 'analog';
  }
}
