import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Tab } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TabService {
  private http = inject(HttpClient);
  private apiUrl = '/api/tabs';

  getTabsByBoard(boardId: string): Observable<Tab[]> {
    return this.http.get<Tab[]>(`${this.apiUrl}/board/${boardId}`);
  }

  getTab(tabId: string): Observable<Tab> {
    return this.http.get<Tab>(`${this.apiUrl}/${tabId}`);
  }

  createTab(tab: Partial<Tab>): Observable<Tab> {
    return this.http.post<Tab>(this.apiUrl, tab);
  }

  updateTab(tabId: string, tab: Partial<Tab>): Observable<Tab> {
    return this.http.patch<Tab>(`${this.apiUrl}/${tabId}`, tab);
  }

  deleteTab(tabId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${tabId}`);
  }
}
