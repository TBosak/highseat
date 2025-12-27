import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppSettings {
  id: string;
  globalCustomCss: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/settings';

  /**
   * Get global settings
   */
  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.apiUrl);
  }

  /**
   * Update global custom CSS
   */
  updateGlobalCss(css: string | null): Observable<AppSettings> {
    return this.http.patch<AppSettings>(`${this.apiUrl}/custom-css`, {
      globalCustomCss: css
    });
  }
}
