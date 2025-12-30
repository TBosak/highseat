import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { WidgetFormComponent } from './widget-form.interface';

export interface PlexWidgetFormData {
  serverUrl: string;
  token: string;
}

@Component({
  selector: 'app-plex-widget-form',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  styleUrls: ['./_widget-forms-shared.scss'],
  template: `
    <div class="form-group">
      <label for="plexServerUrl">Plex Server URL *</label>
      <div class="input-with-icon">
        <fa-icon [icon]="faLink" class="input-icon"></fa-icon>
        <input
          id="plexServerUrl"
          type="url"
          [value]="serverUrl()"
          (input)="handleServerUrlChange($any($event.target).value)"
          placeholder="http://192.168.1.100:32400"
          required
        />
      </div>
      <small class="input-hint">URL of your Plex server</small>
    </div>

    <div class="form-group">
      <label for="plexToken">Plex Token *</label>
      <input
        id="plexToken"
        type="password"
        [value]="token()"
        (input)="handleTokenChange($any($event.target).value)"
        placeholder="Your Plex authentication token"
        required
      />
      <small class="input-hint">⚠️ Token will be stored securely</small>
    </div>
  `
})
export class PlexWidgetFormComponent implements WidgetFormComponent {
  faLink = faLink;

  serverUrl = signal('');
  token = signal('');

  @Output() dataChange = new EventEmitter<PlexWidgetFormData>();

  handleServerUrlChange(value: string): void {
    this.serverUrl.set(value);
    this.emitData();
  }

  handleTokenChange(value: string): void {
    this.token.set(value);
    this.emitData();
  }

  private emitData(): void {
    this.dataChange.emit({
      serverUrl: this.serverUrl(),
      token: this.token()
    });
  }

  validate(): boolean {
    return this.serverUrl().trim() !== '' && this.token().trim() !== '';
  }

  getData(): PlexWidgetFormData {
    return {
      serverUrl: this.serverUrl(),
      token: this.token()
    };
  }
}
