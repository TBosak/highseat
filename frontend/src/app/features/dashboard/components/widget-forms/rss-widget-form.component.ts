import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { WidgetFormComponent } from './widget-form.interface';

export interface RssWidgetFormData {
  feedUrl: string;
  widgetName: string;
  itemLimit: number;
  showDescription: boolean;
  showPublishDate: boolean;
}

@Component({
  selector: 'app-rss-widget-form',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  styleUrls: ['./_widget-forms-shared.scss'],
  template: `
    <div class="form-group">
      <label for="rssFeedUrl">RSS Feed URL *</label>
      <div class="input-with-icon">
        <fa-icon [icon]="faLink" class="input-icon"></fa-icon>
        <input
          id="rssFeedUrl"
          type="url"
          [value]="feedUrl()"
          (input)="handleFeedUrlChange($any($event.target).value)"
          placeholder="https://example.com/feed.xml"
          required
        />
      </div>
      <small class="input-hint">URL of the RSS or Atom feed</small>
    </div>

    <div class="form-group">
      <label for="rssWidgetName">Widget Name *</label>
      <input
        id="rssWidgetName"
        type="text"
        [value]="widgetName()"
        (input)="handleWidgetNameChange($any($event.target).value)"
        placeholder="e.g. Tech News, Blog Posts"
        required
      />
      <small class="input-hint">A display name for this feed</small>
    </div>

    <div class="form-group">
      <label for="rssItemLimit">Number of Items</label>
      <input
        id="rssItemLimit"
        type="number"
        min="1"
        max="50"
        [value]="itemLimit()"
        (input)="handleItemLimitChange($any($event.target).value)"
      />
      <small class="input-hint">Maximum number of feed items to display (1-50)</small>
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          [checked]="showDescription()"
          (change)="handleShowDescriptionChange($any($event.target).checked)"
        />
        <span>Show article descriptions</span>
      </label>
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          [checked]="showPublishDate()"
          (change)="handleShowPublishDateChange($any($event.target).checked)"
        />
        <span>Show publish dates</span>
      </label>
    </div>
  `
})
export class RssWidgetFormComponent implements WidgetFormComponent {
  faLink = faLink;

  feedUrl = signal('');
  widgetName = signal('');
  itemLimit = signal(10);
  showDescription = signal(true);
  showPublishDate = signal(true);

  @Output() dataChange = new EventEmitter<RssWidgetFormData>();

  handleFeedUrlChange(value: string): void {
    this.feedUrl.set(value);
    this.emitData();
  }

  handleWidgetNameChange(value: string): void {
    this.widgetName.set(value);
    this.emitData();
  }

  handleItemLimitChange(value: string): void {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      this.itemLimit.set(num);
      this.emitData();
    }
  }

  handleShowDescriptionChange(checked: boolean): void {
    this.showDescription.set(checked);
    this.emitData();
  }

  handleShowPublishDateChange(checked: boolean): void {
    this.showPublishDate.set(checked);
    this.emitData();
  }

  private emitData(): void {
    this.dataChange.emit({
      feedUrl: this.feedUrl(),
      widgetName: this.widgetName(),
      itemLimit: this.itemLimit(),
      showDescription: this.showDescription(),
      showPublishDate: this.showPublishDate()
    });
  }

  validate(): boolean {
    return this.feedUrl().trim() !== '' && this.widgetName().trim() !== '';
  }

  getData(): RssWidgetFormData {
    return {
      feedUrl: this.feedUrl(),
      widgetName: this.widgetName(),
      itemLimit: this.itemLimit(),
      showDescription: this.showDescription(),
      showPublishDate: this.showPublishDate()
    };
  }
}
