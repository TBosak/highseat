import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import type { Permission } from '../models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const requiredPermissions = route.data['permissions'] as Permission[] | undefined;

  if (requiredPermissions && !authService.hasPermissions(requiredPermissions)) {
    router.navigate(['/forbidden']);
    return false;
  }

  return true;
};
