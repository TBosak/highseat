import { Injectable, signal } from '@angular/core';
import type { Card } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AddCardModalService {
  private _showModal = signal(false);
  private _editingCard = signal<Card | null>(null);

  readonly showModal = this._showModal.asReadonly();
  readonly editingCard = this._editingCard.asReadonly();

  open(): void {
    this._editingCard.set(null);
    this._showModal.set(true);
  }

  openForEdit(card: Card): void {
    this._editingCard.set(card);
    this._showModal.set(true);
  }

  close(): void {
    this._showModal.set(false);
    this._editingCard.set(null);
  }

  toggle(): void {
    this._showModal.update(v => !v);
  }
}
