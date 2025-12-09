import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BackgroundSettingsModalService {
  private _showModal = signal(false);
  readonly showModal = this._showModal.asReadonly();

  open(): void {
    this._showModal.set(true);
  }

  close(): void {
    this._showModal.set(false);
  }

  toggle(): void {
    this._showModal.update(v => !v);
  }
}
