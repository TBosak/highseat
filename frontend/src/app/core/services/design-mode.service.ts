import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DesignModeService {
  private _isDesignMode = signal(false);

  readonly isDesignMode = computed(() => this._isDesignMode());

  toggle(): void {
    this._isDesignMode.update(v => !v);
  }

  enable(): void {
    this._isDesignMode.set(true);
  }

  disable(): void {
    this._isDesignMode.set(false);
  }

  set(value: boolean): void {
    this._isDesignMode.set(value);
  }
}
