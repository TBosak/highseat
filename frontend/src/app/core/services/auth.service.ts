import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject, switchMap, map } from 'rxjs';
import type { User, AuthResponse, Permission } from '../models';
import { ThemeService } from './theme.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  private userSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);

  user$ = this.userSubject.asObservable();
  permissions$ = this.permissionsSubject.asObservable();

  private currentUser = signal<User | null>(this.getUserFromStorage());
  private currentPermissions = signal<Permission[]>([]);

  user = computed(() => this.currentUser());
  permissions = computed(() => this.currentPermissions());
  isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    if (this.getAccessToken()) {
      this.loadUserInfo();
    }
  }

  register(username: string, password: string, displayName?: string, email?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { username, password, displayName, email })
      .pipe(
        tap(response => {
          this.setAccessToken(response.accessToken);
          this.setRefreshToken(response.refreshToken);
          this.currentUser.set(response.user);
          this.userSubject.next(response.user);
          this.saveUserToStorage(response.user);
        }),
        switchMap((authResponse) =>
          this.http.get<{ user: User & { permissions: Permission[] } }>('/api/auth/me').pipe(
            map(meResponse => ({ authResponse, meResponse }))
          )
        ),
        map(({ authResponse, meResponse }) => {
          const user: User = {
            id: meResponse.user.id,
            username: meResponse.user.username,
            email: meResponse.user.email,
            roles: meResponse.user.roles,
            displayName: meResponse.user.displayName || meResponse.user.username,
            preferredThemeId: meResponse.user.preferredThemeId,
            preferredStyleMode: meResponse.user.preferredStyleMode
          };
          this.currentUser.set(user);
          this.currentPermissions.set(meResponse.user.permissions);
          this.userSubject.next(user);
          this.permissionsSubject.next(meResponse.user.permissions);
          this.saveUserToStorage(user);
          this.applyUserTheme(user);
          return authResponse;
        })
      );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { username, password })
      .pipe(
        tap(response => {
          this.setAccessToken(response.accessToken);
          this.setRefreshToken(response.refreshToken);
          this.currentUser.set(response.user);
          this.userSubject.next(response.user);
          this.saveUserToStorage(response.user);
        }),
        switchMap((authResponse) =>
          this.http.get<{ user: User & { permissions: Permission[] } }>('/api/auth/me').pipe(
            map(meResponse => ({ authResponse, meResponse }))
          )
        ),
        map(({ authResponse, meResponse }) => {
          const user: User = {
            id: meResponse.user.id,
            username: meResponse.user.username,
            email: meResponse.user.email,
            roles: meResponse.user.roles,
            displayName: meResponse.user.displayName || meResponse.user.username,
            preferredThemeId: meResponse.user.preferredThemeId,
            preferredStyleMode: meResponse.user.preferredStyleMode
          };
          this.currentUser.set(user);
          this.currentPermissions.set(meResponse.user.permissions);
          this.userSubject.next(user);
          this.permissionsSubject.next(meResponse.user.permissions);
          this.saveUserToStorage(user);
          this.applyUserTheme(user);
          return authResponse;
        })
      );
  }

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    return this.http.post('/api/auth/logout', { refreshToken })
      .pipe(tap(() => {
        this.clearAuth();
        this.router.navigate(['/login']);
      }));
  }

  refreshAccessToken(): Observable<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<{ accessToken: string; refreshToken: string }>(
      '/api/auth/refresh',
      { refreshToken }
    ).pipe(
      tap(response => {
        this.setAccessToken(response.accessToken);
        this.setRefreshToken(response.refreshToken);
      })
    );
  }

  private loadUserInfo(): void {
    this.http.get<{ user: User & { permissions: Permission[] } }>('/api/auth/me')
      .subscribe({
        next: (response) => {
          const user: User = {
            id: response.user.id,
            username: response.user.username,
            email: response.user.email,
            roles: response.user.roles,
            displayName: response.user.displayName || response.user.username,
            preferredThemeId: response.user.preferredThemeId,
            preferredStyleMode: response.user.preferredStyleMode
          };
          this.currentUser.set(user);
          this.currentPermissions.set(response.user.permissions);
          this.userSubject.next(user);
          this.permissionsSubject.next(response.user.permissions);
          this.saveUserToStorage(user);
          this.applyUserTheme(user);
        },
        error: () => {
          this.clearAuth();
        }
      });
  }

  private clearAuth(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.currentPermissions.set([]);
    this.userSubject.next(null);
    this.permissionsSubject.next([]);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  private saveUserToStorage(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  hasPermission(permission: Permission): boolean {
    return this.currentPermissions().includes(permission);
  }

  hasPermissions(permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  private applyUserTheme(user: User): void {
    if (user.preferredThemeId) {
      this.themeService.getTheme(user.preferredThemeId).subscribe({
        next: (theme) => {
          // Override style mode if user has preference
          if (user.preferredStyleMode) {
            theme = { ...theme, styleMode: user.preferredStyleMode };
          }
          this.themeService.applyTheme(theme);
          console.log('Applied user preferred theme:', theme.name);
        },
        error: (err) => {
          console.error('Failed to load user preferred theme:', err);
        }
      });
    }
  }

  updateUserThemePreference(themeId: string, styleMode?: string): Observable<User> {
    return this.http.patch<User>('/api/users/me/theme-preference', {
      preferredThemeId: themeId,
      preferredStyleMode: styleMode
    }).pipe(
      tap(updatedUser => {
        this.currentUser.set(updatedUser);
        this.userSubject.next(updatedUser);
        this.saveUserToStorage(updatedUser);
      })
    );
  }
}
