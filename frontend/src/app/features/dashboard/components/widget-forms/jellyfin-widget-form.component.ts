import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { WidgetFormComponent } from './widget-form.interface';

export interface JellyfinWidgetFormData {
  serverUrl: string;
  apiKey: string;
}

@Component({
  selector: 'app-jellyfin-widget-form',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  styleUrls: ['./_widget-forms-shared.scss'],
  template: `
    <div class="form-group">
      <label for="jellyfinServerUrl">Jellyfin Server URL *</label>
      <div class="input-with-icon">
        <fa-icon [icon]="faLink" class="input-icon"></fa-icon>
        <input
          id="jellyfinServerUrl"
          type="url"
          [value]="serverUrl()"
          (input)="handleServerUrlChange($any($event.target).value)"
          placeholder="http://192.168.1.100:8096"
          required
        />
      </div>
      <small class="input-hint">URL of your Jellyfin server</small>
    </div>

    <div class="form-group">
      <label for="jellyfinApiKey">API Key *</label>
      <input
        id="jellyfinApiKey"
        type="password"
        [value]="apiKey()"
        (input)="handleApiKeyChange($any($event.target).value)"
        placeholder="Your Jellyfin API key"
        required
      />
      <small class="input-hint">⚠️ API key will be stored securely</small>
    </div>
  `
})
export class JellyfinWidgetFormComponent implements WidgetFormComponent {
  faLink = faLink;

  serverUrl = signal('');
  apiKey = signal('');

  @Output() dataChange = new EventEmitter<JellyfinWidgetFormData>();

  handleServerUrlChange(value: string): void {
    this.serverUrl.set(value);
    this.emitData();
  }

  handleApiKeyChange(value: string): void {
    this.apiKey.set(value);
    this.emitData();
  }

  private emitData(): void {
    this.dataChange.emit({
      serverUrl: this.serverUrl(),
      apiKey: this.apiKey()
    });
  }

  validate(): boolean {
    return this.serverUrl().trim() !== '' && this.apiKey().trim() !== '';
  }

  getData(): JellyfinWidgetFormData {
    return {
      serverUrl: this.serverUrl(),
      apiKey: this.apiKey()
    };
  }
}
