import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip auth header for auth endpoints
  if (req.url.includes('/api/auth/login') ||
      req.url.includes('/api/auth/register') ||
      req.url.includes('/api/auth/refresh')) {
    return next(req);
  }

  const token = authService.getAccessToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401 && !req.url.includes('/api/auth/refresh')) {
        // Try to refresh the token
        return authService.refreshAccessToken().pipe(
          switchMap(() => {
            // Retry the request with new token
            const newToken = authService.getAccessToken();
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`
              }
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // Refresh failed, redirect to login
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
