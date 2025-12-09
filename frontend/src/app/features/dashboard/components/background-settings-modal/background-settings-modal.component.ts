import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faXmark, faUpload, faTrash } from '@fortawesome/free-solid-svg-icons';
import { HttpClient } from '@angular/common/http';
import { Tab } from '../../../../core/models';

@Component({
  selector: 'app-background-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './background-settings-modal.component.html',
  styleUrls: ['./background-settings-modal.component.scss']
})
export class BackgroundSettingsModalComponent {
  @Input() currentTab!: Tab;
  @Output() cancelled = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{ tabIds: string[], settings: Partial<Tab> }>();

  private http = inject(HttpClient);

  faXmark = faXmark;
  faUpload = faUpload;
  faTrash = faTrash;

  backgroundImage = signal<string | null | undefined>(undefined);
  backgroundBlur = signal(0);
  backgroundOpacity = signal(100);
  uploading = signal(false);
  uploadError = signal<string | undefined>(undefined);

  ngOnInit() {
    // Initialize with current tab settings
    this.backgroundImage.set(this.currentTab?.backgroundImage);
    this.backgroundBlur.set(this.currentTab?.backgroundBlur || 0);
    this.backgroundOpacity.set(this.currentTab?.backgroundOpacity || 100);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.uploadError.set('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.uploadError.set('File too large. Maximum size is 10MB.');
      return;
    }

    this.uploadError.set(undefined);
    this.uploading.set(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.http
        .post<{ url: string }>('/api/uploads/background', formData)
        .toPromise();

      if (response?.url) {
        this.backgroundImage.set(response.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      this.uploadError.set('Failed to upload image. Please try again.');
    } finally {
      this.uploading.set(false);
      // Reset file input
      input.value = '';
    }
  }

  removeBackground(): void {
    this.backgroundImage.set(undefined);
  }

  save(): void {
    const settings: Partial<Tab> = {
      backgroundImage: this.backgroundImage() ?? null,
      backgroundBlur: this.backgroundBlur(),
      backgroundOpacity: this.backgroundOpacity()
    };

    this.saved.emit({ tabIds: [this.currentTab.id], settings });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
