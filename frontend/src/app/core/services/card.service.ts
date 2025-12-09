import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Card, CardStyle } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private http = inject(HttpClient);
  private apiUrl = '/api/cards';

  getCardsByZone(zoneId: string): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.apiUrl}/zone/${zoneId}`);
  }

  getCard(cardId: string): Observable<Card> {
    return this.http.get<Card>(`${this.apiUrl}/${cardId}`);
  }

  createCard(card: Partial<Card>): Observable<Card> {
    return this.http.post<Card>(this.apiUrl, card);
  }

  updateCard(cardId: string, card: Partial<Card>): Observable<Card> {
    return this.http.patch<Card>(`${this.apiUrl}/${cardId}`, card);
  }

  updateCardLayout(cardId: string, layout: Partial<Pick<Card, 'layoutX' | 'layoutY' | 'layoutW' | 'layoutH' | 'layoutLocked'>>): Observable<Card> {
    return this.http.patch<Card>(`${this.apiUrl}/${cardId}/layout`, layout);
  }

  updateCardStyle(cardId: string, style: CardStyle): Observable<Card> {
    return this.http.patch<Card>(`${this.apiUrl}/${cardId}/style`, { style });
  }

  deleteCard(cardId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${cardId}`);
  }
}
