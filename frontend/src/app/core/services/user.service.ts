import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { User } from '../models';

export interface CreateUserData {
  username: string;
  password: string;
  displayName?: string;
  roles: string[];
}

export interface UpdateUserData {
  username?: string;
  password?: string;
  displayName?: string;
  roles?: string[];
}

export interface UpdateUserPreferencesData {
  hideLogo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = '/api/users';

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  createUser(data: CreateUserData): Observable<User> {
    return this.http.post<User>(this.apiUrl, data);
  }

  updateUser(userId: string, data: UpdateUserData): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}`, data);
  }

  updatePreferences(data: UpdateUserPreferencesData): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/me/preferences`, data);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }
}
