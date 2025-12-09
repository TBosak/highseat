import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    data: { permissions: ['board:view'] },
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    data: { permissions: ['board:edit'] },
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'themes',
    canActivate: [authGuard],
    data: { permissions: ['board:view'] },
    loadComponent: () =>
      import('./features/themes/theme-browser/theme-browser.component').then(
        (m) => m.ThemeBrowserComponent
      ),
  },
  {
    path: 'boards/:boardSlug/:tabSlug',
    canActivate: [authGuard],
    data: { permissions: ['board:view'] },
    loadComponent: () =>
      import('./features/dashboard/board-view/board-view.component').then(
        (m) => m.BoardViewComponent
      ),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '**',
    redirectTo: '/',
  },
];
