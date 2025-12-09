# Setup Instructions

## What Has Been Created

This project has been scaffolded with a **Bun + Hono + SQLite backend** and an **Angular 21 frontend** using the latest standalone APIs and signals.

### Backend (Hono + Bun + SQLite)

✅ **Completed:**
- `/backend` - Hono API server with Bun runtime
- Database schema with Drizzle ORM (SQLite)
  - Users, Boards, Tabs, Zones, Cards, Themes, Refresh Tokens
- JWT authentication with refresh tokens
- RBAC (Role-Based Access Control)
- Complete CRUD APIs for:
  - Auth (register, login, refresh, logout)
  - Boards, Tabs, Zones, Cards
  - Themes
- Static file serving configuration for Angular build
- Database seed with default themes and admin user

### Frontend (Angular 21)

✅ **Completed:**
- `/frontend` - Angular 21 app with standalone components
- Core services:
  - `AuthService` - JWT auth with signals
  - `BoardService` - Board management
  - `TabService` - Tab management
  - `CardService` - Card CRUD and styling
  - `ThemeService` - Base16/Base24 theming
  - `DesignModeService` - Design mode toggle
- Auth interceptor for automatic token injection
- Auth guard for route protection
- `*hasPermission` directive for UI permissions
- TypeScript models for all entities
- SCSS theming with style modes (glassmorphic, neobrutal, minimal, clay)

## Next Steps to Complete Setup

### 1. Fix File Permission Issue (WSL)

There's a file permission issue with `frontend/src/app/app.config.ts`. Run this:

```bash
cd /mnt/e/Projects/homelab-dash/frontend/src/app
sudo rm -f app.config.ts
cat > app.config.ts << 'EOF'
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};
EOF
```

### 2. Install Dependencies

```bash
# Install root dependencies
bun install

# Install backend dependencies
cd backend
bun install

# Install frontend dependencies (including Angular CDK)
cd ../frontend
bun install
bun add @angular/cdk ngx-color-picker
```

### 3. Initialize Database

```bash
cd backend

# Generate migrations
bunx drizzle-kit generate

# Run migrations
bun run db:migrate

# Seed database with themes and admin user
bun run db:seed
```

Default admin credentials:
- Email: `admin@homelab.local`
- Password: `admin123`

### 4. Create Frontend Components

You still need to create these Angular components:

#### Login Component
```bash
cd frontend
ng generate component features/auth/login --standalone
```

#### Dashboard/Board Components
```bash
ng generate component features/dashboard/board-list --standalone
ng generate component features/dashboard/board-view --standalone
ng generate component features/dashboard/components/card --standalone
ng generate component features/dashboard/components/tab-bar --standalone
```

#### Update Routes
Edit `frontend/src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'boards',
    canActivate: [authGuard],
    data: { permissions: ['board:view'] },
    loadComponent: () => import('./features/dashboard/board-list/board-list.component')
      .then(m => m.BoardListComponent)
  },
  {
    path: 'boards/:boardSlug/:tabSlug',
    canActivate: [authGuard],
    data: { permissions: ['board:view'] },
    loadComponent: () => import('./features/dashboard/board-view/board-view.component')
      .then(m => m.BoardViewComponent)
  },
  {
    path: '',
    redirectTo: '/boards',
    pathMatch: 'full'
  }
];
```

### 5. Development

```bash
# From project root - runs both backend and frontend
bun run dev

# Or separately:
bun run dev:backend  # Runs on :3000
bun run dev:frontend # Runs on :4200 (proxies API calls to :3000)
```

### 6. Production Build

```bash
# Build everything
bun run build

# Start production server (serves Angular from Hono)
bun run start
```

The Hono server will serve the compiled Angular app on port 3000.

## Architecture Overview

```
homelab-dash/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle ORM schema
│   │   │   ├── index.ts           # DB connection
│   │   │   ├── migrate.ts         # Migration runner
│   │   │   └── seed.ts            # Database seeder
│   │   ├── routes/
│   │   │   ├── auth.routes.ts     # Auth endpoints
│   │   │   ├── boards.routes.ts   # Board CRUD
│   │   │   ├── tabs.routes.ts     # Tab CRUD
│   │   │   ├── cards.routes.ts    # Card CRUD + styling
│   │   │   └── themes.routes.ts   # Theme management
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts # JWT + RBAC
│   │   ├── services/
│   │   │   └── auth.service.ts    # Auth logic
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript types
│   │   └── index.ts               # Hono server + static serving
│   ├── drizzle.config.ts
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── core/
    │   │   │   ├── models/        # TypeScript interfaces
    │   │   │   ├── services/      # Auth, Board, Card, Tab, Theme, DesignMode
    │   │   │   ├── guards/        # Auth guard
    │   │   │   └── interceptors/  # Auth interceptor
    │   │   ├── shared/
    │   │   │   └── directives/    # *hasPermission directive
    │   │   ├── features/          # Feature components (to be created)
    │   │   ├── app.config.ts      # App providers
    │   │   └── app.routes.ts      # Route configuration
    │   ├── styles.scss            # Global styles + theming
    │   └── index.html
    ├── proxy.conf.json            # Dev proxy config
    └── package.json

## Key Features Implemented

### Backend
- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ RBAC with permission system (Admin, Designer, Editor, Viewer roles)
- ✅ SQLite database with Drizzle ORM
- ✅ Complete REST API for all entities
- ✅ Static file serving for Angular SPA

### Frontend
- ✅ Angular 21 with standalone components
- ✅ Signals-based state management
- ✅ HTTP interceptor for auth tokens
- ✅ Route guards with permission checking
- ✅ Structural directive for permission-based UI
- ✅ Base16/Base24 theming engine
- ✅ Multiple style modes (glassmorphic, neobrutal, minimal, clay)
- ✅ Design mode service

## What's Left to Build

### Phase 1 (Core Functionality)
- [ ] Create Login/Register components
- [ ] Create Board List component
- [ ] Create Board View component with Tab Bar
- [ ] Implement card grid with CSS Grid layout
- [ ] Add Angular CDK DragDrop for card repositioning

### Phase 2 (Design Mode)
- [ ] Card design toolbar (border-radius, colors, lock)
- [ ] Color picker integration (ngx-color-picker)
- [ ] Card resize handles
- [ ] Icon picker dialog

### Phase 3 (Advanced Features)
- [ ] Background customization (color/image/Pexels)
- [ ] Service catalog integration (UnRAID/TrueNAS)
- [ ] Theme editor UI
- [ ] Admin panel for user/role management
- [ ] WebSocket support for live updates (optional)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user + permissions
- `POST /api/auth/logout` - Logout

### Boards
- `GET /api/boards` - List all boards
- `POST /api/boards` - Create board (also creates default tab & zone)
- `GET /api/boards/:id` - Get board with tabs
- `PATCH /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

### Tabs
- `GET /api/tabs/board/:boardId` - List tabs for board
- `POST /api/tabs` - Create tab (also creates default zone)
- `GET /api/tabs/:id` - Get tab with zones and cards
- `PATCH /api/tabs/:id` - Update tab
- `DELETE /api/tabs/:id` - Delete tab

### Cards
- `GET /api/cards/zone/:zoneId` - List cards in zone
- `POST /api/cards` - Create card
- `GET /api/cards/:id` - Get card
- `PATCH /api/cards/:id` - Update card content
- `PATCH /api/cards/:id/layout` - Update card position/size
- `PATCH /api/cards/:id/style` - Update card styling (requires `board:design`)
- `DELETE /api/cards/:id` - Delete card

### Themes
- `GET /api/themes` - List all themes
- `POST /api/themes` - Create theme (requires `theme:edit`)
- `GET /api/themes/:id` - Get theme
- `PATCH /api/themes/:id` - Update theme
- `DELETE /api/themes/:id` - Delete theme

## Environment Variables

Backend `.env`:
```
PORT=3000
JWT_SECRET=change-this-to-a-secure-random-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_PATH=./dash.db
PEXELS_API_KEY=your-api-key
NODE_ENV=development
```

## Permissions

- `board:view` - View boards
- `board:edit` - Edit board structure
- `board:design` - Access design mode and card styling
- `card:add` - Add new cards
- `card:edit` - Edit card content
- `card:delete` - Delete cards
- `theme:edit` - Create and edit themes
- `role:manage` - Manage user roles
- `user:manage` - Manage users

## Default Roles

- **Viewer** - Can only view boards (`board:view`)
- **Editor** - Can view and edit content (`board:view`, `board:edit`, `card:add`, `card:edit`, `card:delete`)
- **Designer** - Editor + design capabilities (all editor perms + `board:design`, `theme:edit`)
- **Admin** - Full access to everything

## Troubleshooting

### Port conflicts
If ports 3000 or 4200 are in use, update:
- Backend: `backend/.env` PORT value
- Frontend: `frontend/proxy.conf.json` target URL

### Database locked
If you get "database is locked" errors, close all connections and restart the server.

### WSL file permission issues
If you encounter permission errors on WSL, try running with sudo or fixing ownership:
```bash
sudo chown -R $USER:$USER /mnt/e/Projects/homelab-dash
```
