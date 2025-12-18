import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject, switchMap, map, finalize, share } from 'rxjs';
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
  private readonly PERMISSIONS_KEY = 'permissions';

  private userSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  private permissionsSubject = new BehaviorSubject<Permission[]>(this.getPermissionsFromStorage());

  user$ = this.userSubject.asObservable();
  permissions$ = this.permissionsSubject.asObservable();

  private currentUser = signal<User | null>(this.getUserFromStorage());
  private currentPermissions = signal<Permission[]>(this.getPermissionsFromStorage());

  // Track in-progress token refresh to prevent duplicate requests
  private refreshTokenInProgress$: Observable<{ accessToken: string; refreshToken: string }> | null = null;

  user = computed(() => this.currentUser());
  permissions = computed(() => this.currentPermissions());
  isAuthenticated = computed(() => !!this.currentUser());

  constructor() {
    if (this.getAccessToken()) {
      // Apply theme immediately from stored user data (before API call)
      const storedUser = this.getUserFromStorage();
      if (storedUser) {
        this.applyUserTheme(storedUser);
      }
      this.loadUserInfo();
    }
  }

  register(username: string, password: string, displayName?: string ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { username, password, displayName })
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
            roles: meResponse.user.roles,
            displayName: meResponse.user.displayName || meResponse.user.username,
            preferredThemeId: meResponse.user.preferredThemeId,
            preferredStyleMode: meResponse.user.preferredStyleMode,
            hideLogo: meResponse.user.hideLogo
          };
          this.currentUser.set(user);
          this.currentPermissions.set(meResponse.user.permissions);
          this.userSubject.next(user);
          this.permissionsSubject.next(meResponse.user.permissions);
          this.saveUserToStorage(user);
          this.savePermissionsToStorage(meResponse.user.permissions);
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
            roles: meResponse.user.roles,
            displayName: meResponse.user.displayName || meResponse.user.username,
            preferredThemeId: meResponse.user.preferredThemeId,
            preferredStyleMode: meResponse.user.preferredStyleMode,
            hideLogo: meResponse.user.hideLogo
          };
          this.currentUser.set(user);
          this.currentPermissions.set(meResponse.user.permissions);
          this.userSubject.next(user);
          this.permissionsSubject.next(meResponse.user.permissions);
          this.saveUserToStorage(user);
          this.savePermissionsToStorage(meResponse.user.permissions);
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
    // If a refresh is already in progress, return the existing observable
    // This prevents multiple simultaneous refresh requests (race condition)
    if (this.refreshTokenInProgress$) {
      return this.refreshTokenInProgress$;
    }

    const refreshToken = this.getRefreshToken();

    // Create and store the refresh observable
    this.refreshTokenInProgress$ = this.http.post<{ accessToken: string; refreshToken: string }>(
      '/api/auth/refresh',
      { refreshToken }
    ).pipe(
      tap(response => {
        this.setAccessToken(response.accessToken);
        this.setRefreshToken(response.refreshToken);
      }),
      // Share the observable so multiple subscribers get the same result
      share(),
      // Clear the in-progress flag when complete (success or error)
      finalize(() => {
        this.refreshTokenInProgress$ = null;
      })
    );

    return this.refreshTokenInProgress$;
  }

  private loadUserInfo(): void {
    this.http.get<{ user: User & { permissions: Permission[] } }>('/api/auth/me')
      .subscribe({
        next: (response) => {
          const user: User = {
            id: response.user.id,
            username: response.user.username,
            roles: response.user.roles,
            displayName: response.user.displayName || response.user.username,
            preferredThemeId: response.user.preferredThemeId,
            preferredStyleMode: response.user.preferredStyleMode,
            hideLogo: response.user.hideLogo
          };
          this.currentUser.set(user);
          this.currentPermissions.set(response.user.permissions);
          this.userSubject.next(user);
          this.permissionsSubject.next(response.user.permissions);
          this.saveUserToStorage(user);
          this.savePermissionsToStorage(response.user.permissions);
          this.applyUserTheme(user);
        },
        error: (err) => {
          // Only clear auth if the refresh token also failed (403) or is invalid
          // The interceptor will handle 401 errors by refreshing the token
          if (err.status === 403 || err.status === 0) {
            console.error('Failed to load user info, clearing auth:', err);
            this.clearAuth();
            this.router.navigate(['/login']);
          }
        }
      });
  }

  private clearAuth(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.PERMISSIONS_KEY);
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

  private getPermissionsFromStorage(): Permission[] {
    const permissionsJson = localStorage.getItem(this.PERMISSIONS_KEY);
    return permissionsJson ? JSON.parse(permissionsJson) : [];
  }

  private savePermissionsToStorage(permissions: Permission[]): void {
    localStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(permissions));
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

  updateUser(user: User): void {
    this.currentUser.set(user);
    this.userSubject.next(user);
    this.saveUserToStorage(user);
  }
}
