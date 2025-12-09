## 1. High-level architecture

**Stack**

* **Frontend:** Angular (latest), Standalone APIs, Signals, Angular CDK
* **UI layer:**

  * Angular CDK DragDrop for the grid
  * CSS grid for layout + card positioning
  * Design-style engine (glassmorphic / neobrutal / etc.) driven by theme tokens
  * `ngx-color-picker` in “Design Mode”
* **Backend:**

  * Bun or Node.js + NestJS / Express / Hono (your choice)
  * REST or GraphQL API + WebSocket for live updates
  * SQLite or Postgres for persistent config
* **AuthN/AuthZ:**

  * JWT-based auth with refresh tokens
  * Role-based Access Control (RBAC) at API & UI level
* **Theming & assets:**

  * Base16/Base24 theme tokens stored as JSON
  * Pexels API integration for backgrounds
  * Local file uploads for backgrounds
  * Icon catalogs from external APIs (UnRAID, TrueNAS, others) + local override

**Core concepts**

* **Board** – one dashboard (e.g., “Main Homelab”, “Media”, “Infra”)
* **Zone** (optional) – logical area of a board (e.g., “Media Stack”, “Storage”)
* **Card** – represents one self-hosted service or a custom widget
* **Theme** – base16/base24 palette + style mode (glassmorphic, neobrutal, etc.)
* **Role** – set of permissions for users (view, edit, design, admin)

---

## 2. Domain model (backend)

Rough TypeScript-style interfaces:

```ts
type StyleMode = 'glassmorphic' | 'neobrutal' | 'minimal' | 'clay' | 'custom';

interface Theme {
  id: string;
  name: string;
  baseScheme: 'base16' | 'base24';
  tokens: Record<string, string>; // e.g. base00, base01, ..., base0F / base23
  styleMode: StyleMode;
  useGlobalBackground: boolean;
  background?: {
    type: 'color' | 'image' | 'pexels';
    value: string; // hex for color, URL for image/pexels
    blur?: number;
    opacity?: number;
  };
}

interface Board {
  id: string;
  name: string;
  slug: string;
  themeId: string;
  defaultLayout: 'grid' | 'freeform';
  isLocked: boolean; // global lock (no dragging/resizing)
  zones: Zone[];
  createdBy: string; // userId
}

interface Zone {
  id: string;
  name: string;
  order: number;
  cards: Card[];
}

interface Card {
  id: string;
  title: string;
  subtitle?: string;
  serviceType?: string; // 'truenas', 'unraid', 'plex', 'sonarr', ...
  icon?: IconConfig;
  layout: CardLayout;
  style: CardStyle;
  widgets?: CardWidget[]; // optional extra plugin system later
  meta?: Record<string, any>;
}

interface IconConfig {
  source: 'catalog' | 'custom';
  catalogId?: string;   // e.g. 'unraid/community-apps'
  iconKey?: string;     // key from catalog
  customUrl?: string;   // uploaded or external
}

interface CardLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  locked?: boolean; // lock this card from drag/resize
}

interface CardStyle {
  borderRadius?: number;
  borderWidth?: number;
  borderStyle?: 'none' | 'solid' | 'dashed';
  borderColorToken?: string; // reference to theme token
  backgroundToken?: string;
  textColorToken?: string;
  elevation?: number;
  glassmorphic?: {
    blur?: number;
    transparency?: number;
    borderHighlight?: boolean;
  };
  neobrutal?: {
    thickBorder?: boolean;
    dropShadow?: boolean;
    cornerCut?: boolean;
  };
}

interface CardWidget {
  type: 'link' | 'status' | 'iframe' | 'metric' | 'custom';
  config: Record<string, any>;
}

interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  roles: string[]; // ['admin', 'viewer', 'designer']
}

interface Role {
  id: string;
  name: string; // 'admin', 'viewer', 'designer'
  permissions: Permission[]; 
}

type Permission =
  | 'board:view'
  | 'board:edit'
  | 'board:design'
  | 'card:add'
  | 'card:edit'
  | 'card:delete'
  | 'theme:edit'
  | 'role:manage'
  | 'user:manage';
```

---

## 3. Feature breakdown & Angular modules

### 3.1. App module structure

* `app/core`

  * Auth service, HTTP interceptors, error handling
  * Config & environment tokens
  * Theming engine service
* `app/shared`

  * Reusable components (buttons, modals, icons, color pickers wrappers)
  * Pipes, directives (permission-based `*hasPermission`, etc.)
* `app/auth`

  * Login/Logout/Register
  * Role-aware guard, route data like `{ requiredPermissions: [...] }`
* `app/dashboard`

  * Board listing & selection
  * Board view component (grid)
  * Design Mode overlay + toolbar
* `app/designer`

  * Theme editor (base16/base24)
  * Background picker (color, file, Pexels)
  * Card editor (border radius, colors, icon selection, resize)
* `app/admin`

  * User & role management

Use **standalone components** and **feature-based routing**.

---

## 4. Grid layout & drag/drop

### 4.1. Layout approach

* Use CSS Grid at the container level to maintain a predictable column/row system:

  ```css
  .board-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    grid-auto-rows: 120px;
    gap: 1rem;
  }
  ```
* Store `x, y, w, h` in logical grid units. Convert to `grid-column` and `grid-row`:

  ```html
  <div
    class="card"
    [style.gridColumn]="card.layout.x + ' / span ' + card.layout.w"
    [style.gridRow]="card.layout.y + ' / span ' + card.layout.h">
  </div>
  ```

### 4.2. Drag & drop / resize

* Use **Angular CDK DragDrop**:

  * `cdkDrag` & `cdkDropList` at card & grid levels
  * On drop: recompute nearest `(x, y)` grid position
* For resize:

  * Option 1: simple custom handles (`[card-resize]` directive that listens to `mousedown` & pointer move)
  * Option 2: integrate a small 3rd-party Angular resizable directive
* Honor locking:

  * If `board.isLocked || card.layout.locked`, disable drag & resize
  * In template:

    ```html
    <div
      *ngFor="let card of cards"
      cdkDrag
      [cdkDragDisabled]="isLocked || card.layout.locked">
    ```

### 4.3. Design Mode toggling

Global service:

```ts
@Injectable({ providedIn: 'root' })
export class DesignModeService {
  private _isDesignMode = signal(false);
  readonly isDesignMode = computed(() => this._isDesignMode());

  toggle() { this._isDesignMode.update(v => !v); }
  enable() { this._isDesignMode.set(true); }
  disable() { this._isDesignMode.set(false); }
}
```

In board view:

```html
<button (click)="designMode.toggle()" *hasPermission="'board:design'">
  {{ designMode.isDesignMode() ? 'Exit Design Mode' : 'Design Mode' }}
</button>

<div class="board-grid" [class.design-mode]="designMode.isDesignMode()">
  <app-card
    *ngFor="let card of cards"
    [card]="card"
    [designMode]="designMode.isDesignMode()">
  </app-card>
</div>
```

Each card, when `designMode=true`, shows:

* Border-radius icon
* Color-pick icon
* Resize handle icons
* Drag handle (e.g., a grip icon)
* Lock icon

---

## 5. Theming engine (Base16/Base24 + style modes)

### 5.1. Theme token storage

Store theme JSON like:

```json
{
  "id": "solarized-dark",
  "name": "Solarized Dark",
  "baseScheme": "base16",
  "styleMode": "glassmorphic",
  "tokens": {
    "base00": "#002b36",
    "base01": "#073642",
    "base02": "#586e75",
    "base03": "#657b83",
    "base04": "#839496",
    "base05": "#93a1a1",
    "base06": "#eee8d5",
    "base07": "#fdf6e3",
    "base08": "#dc322f",
    "base09": "#cb4b16",
    "base0A": "#b58900",
    "base0B": "#859900",
    "base0C": "#2aa198",
    "base0D": "#268bd2",
    "base0E": "#6c71c4",
    "base0F": "#d33682"
  }
}
```

### 5.2. CSS variable mapping

On theme load, set `:root` variables:

```ts
applyTheme(theme: Theme) {
  const root = document.documentElement;
  Object.entries(theme.tokens).forEach(([token, value]) => {
    root.style.setProperty(`--${token}`, value);
  });

  // Derived tokens: background, card, accent, etc.
  root.style.setProperty('--bg', `var(--base00)`);
  root.style.setProperty('--bg-elevated', `var(--base01)`);
  root.style.setProperty('--text', `var(--base05)`);
}
```

Style modes determine *how* tokens are used:

#### Glassmorphic

```css
.card.glassmorphic {
  background: color-mix(in srgb, var(--bg-elevated) 40%, transparent);
  backdrop-filter: blur(16px);
  border-radius: var(--card-radius, 18px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}
```

#### Neobrutal

```css
.card.neobrutal {
  background: var(--base0A);
  border-radius: var(--card-radius, 8px);
  border: 3px solid #000;
  box-shadow: 6px 6px 0 #000;
}
```

And so on for other styles (minimal, clay, etc.).

Cards use `data-style-mode` attribute from theme:

```html
<div class="card" [attr.data-style-mode]="theme.styleMode">
```

---

## 6. Icons & service catalogs

### 6.1. Abstraction layer

Create a **Service Catalog Service** behind a single Angular service that can aggregate UnRAID, TrueNAS, etc.

```ts
interface ServiceIcon {
  id: string;
  name: string;
  source: 'unraid' | 'truenas' | 'custom' | 'other';
  iconUrl: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class ServiceCatalogService {
  constructor(private http: HttpClient) {}

  searchIcons(query: string): Observable<ServiceIcon[]> {
    // Combine upstreams or query backend, which aggregates
    return this.http.get<ServiceIcon[]>(`/api/catalog/icons`, { params: { q: query } });
  }

  getAllPopular(): Observable<ServiceIcon[]> {
    return this.http.get<ServiceIcon[]>(`/api/catalog/popular`);
  }
}
```

### 6.2. Backend integration

Backend `catalog` module:

* `GET /api/catalog/icons?q=unraid` →

  * Calls UnRAID catalog API (or reads cached metadata)
  * Calls TrueNAS catalog API
  * Normalizes results to `ServiceIcon`
* Cache responses in DB or local JSON to avoid hammering upstreams

**Fallback:** ship a static “popular services” icon set for offline / air-gapped homelabs.

### 6.3. Card icon picker (design mode)

In card editor:

* Search field that hits `ServiceCatalogService.searchIcons`
* Grid of icon previews
* Option: “Upload custom icon” → store in backend and return URL
* Selected icon config stored in `card.icon`

---

## 7. Backgrounds: theme-based, custom color, file upload, Pexels

### 7.1. Background selector UI

In Theme designer:

* Radio options:

  * `Use theme default background`
  * `Custom color`
  * `Image upload`
  * `Pexels search`
* Color uses `ngx-color-picker`
* Image upload:

  * POST to `/api/backgrounds/upload` → returns URL
* Pexels:

  * Search input → backend `/api/backgrounds/pexels-search?q=clouds`
  * Backend calls Pexels API (with API key hidden on server), returns sanitized results

### 7.2. Applying background

Board view container:

```html
<div
  class="board-wrapper"
  [ngStyle]="{
    'background-color': bg.type === 'color' ? bg.value : null,
    'background-image': bg.type === 'image' || bg.type === 'pexels' ? 'url(' + bg.value + ')' : 'none'
  }">
```

For glassmorphic, add an overlay layer to soften background:

```html
<div class="board-background"></div>
<div class="board-content">...</div>
```

---

## 8. Design Mode controls per card

### 8.1. UI elements

When `designMode` is on and user has `board:design`:

* Top-right card toolbar with icons:

  * 🎨 color picker (opens `ngx-color-picker`)
  * 🧩 icon picker (opens service catalog)
  * ⤡ resize (toggle handles)
  * ⛓ lock/unlock card
  * ◻️ border radius slider

Example template:

```html
<div class="card-toolbar" *ngIf="designMode && hasPermission('board:design')">
  <button (click)="editCardStyle(card)">🎨</button>
  <button (click)="openIconPicker(card)">🖼</button>
  <button (click)="toggleResize(card)">↔</button>
  <button (click)="toggleLock(card)">
    {{ card.layout.locked ? 'Unlock' : 'Lock' }}
  </button>
  <input type="range"
         min="0"
         max="32"
         [value]="card.style.borderRadius || 16"
         (input)="updateRadius(card, $event.target.value)">
</div>
```

### 8.2. Color picker integration (`ngx-color-picker`)

Wrap in a shared component for easy swap:

```html
<button
  [cpOutputFormat]="'hex'"
  [cpOKButton]="true"
  [cpPosition]="'top'"
  [(colorPicker)]="color"
  (colorPickerChange)="onCardColorChange(card, $event)">
  Pick Color
</button>
```

`onCardColorChange` sets `card.style.backgroundToken` or `customBackgroundColor` and persists.

---

## 9. Auth & RBAC

### 9.1. Authentication

* **Backend**

  * `POST /auth/register`
  * `POST /auth/login` → returns `{ accessToken, refreshToken }`
  * `POST /auth/refresh`
* Hash passwords with Argon2 or bcrypt
* Store JWT secret in env; set short access token lifetime and rotating refresh tokens

### 9.2. Authorization

* Each route annotated with permission requirements:

  * Example: `/api/boards/:id` → `board:view`
  * `/api/boards/:id/cards` (POST/PUT/DELETE) → `board:edit`
  * `/api/theme` edit routes → `theme:edit`
* Middleware checks user roles → resolves to permissions

### 9.3. Angular integration

* `AuthService` to store tokens in memory + localStorage
* `AuthGuard` with route data:

```ts
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const required = route.data['permissions'] as Permission[] | undefined;
  return !required || auth.hasPermissions(required);
};
```

Routes:

```ts
{
  path: 'admin',
  canActivate: [permissionGuard],
  data: { permissions: ['user:manage', 'role:manage'] },
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)
}
```

---

## 10. Contributor-optimized design

### 10.1. Project structure & tooling

* Monorepo with **Nx** or bare Angular workspace + backend
* Clear separation:

  * `/frontend/` Angular app
  * `/backend/` API
* Scripts:

  * `npm run dev:front`
  * `npm run dev:back`
  * `npm run dev` (both using concurrently)
* Documented `CONTRIBUTING.md`:

  * How to run FE/BE
  * Coding standards
  * How to add a new card type
  * How to add a new style mode

### 10.2. Config-driven extensibility

* Define a **Card Type Registry** (`card-type.registry.ts`):

```ts
interface CardType {
  id: string;
  label: string;
  description: string;
  component: Type<unknown>;
  defaultConfig: Record<string, any>;
}

export const CARD_TYPES: CardType[] = [
  {
    id: 'link',
    label: 'Link Card',
    description: 'Single button to open a service URL',
    component: LinkCardComponent,
    defaultConfig: {
      url: '',
      openInNewTab: true
    }
  },
  // etc.
];
```

Contributors add new card types by:

1. Creating a component
2. Adding entry to `CARD_TYPES`
3. (Optional) Adding small docs snippet

### 10.3. Theme packs & style packs

* Store theme packs in `/themes/*.json`
* Allow PRs that simply:

  * Add a new theme JSON
  * Register it in `THEME_REGISTRY`
* Style modes are pure CSS modules + TS enum; adding a new style mode =

  1. Add CSS module (or SCSS partial)
  2. Register in `StyleMode` and mapping

### 10.4. “Design Mode safe” APIs

* All design operations go through a **BoardLayoutService**:

  * `moveCard(boardId, cardId, newLayout)`
  * `resizeCard(boardId, cardId, newLayout)`
  * `updateCardStyle(boardId, cardId, newStyle)`
* Backend enforces layout constraints and sanitization; frontend contributors don’t need to think about persistence details.

---

## 11. Phased implementation plan

### Phase 1 – Foundations

1. **Bootstrap Angular app** with standalone components, routing.
2. **Bootstrap backend** (Bun/Node + Express/Nest/Hono) with:

   * `/auth` routes
   * `/me` route
3. Implement **basic RBAC**:

   * Admin user seed
   * Viewer vs Admin roles
4. Define DB schema (SQLite/Postgres) and migrations.

Deliverable: Basic login, simple page: “Hello {user}”.

---

### Phase 2 – Boards, grid, and basic cards

1. Implement Board CRUD: `/api/boards`.
2. Implement Card model as above; add simple **Link Card** with:

   * Title
   * URL
   * Icon placeholder
3. Build **Board View** with CSS grid + Angular CDK DragDrop.
4. Add “Lock Board” toggle (boolean) — no styles yet.

Deliverable: You can create a board, add cards, drag them around, and lock/unlock layout.

---

### Phase 3 – Theming engine & style modes

1. Implement Theme entity and theme service in backend.
2. Implement **ThemeService** in Angular with CSS variable injection.
3. Create 2–3 base16 themes.
4. Implement 2 style modes:

   * `glassmorphic`
   * `neobrutal`
5. Connect board → theme selection.

Deliverable: Switching themes and style modes noticeably changes card appearance and background.

---

### Phase 4 – Design Mode & per-card styling

1. Implement **DesignModeService** and UI toggle.
2. Card toolbar in Design Mode:

   * Border-radius slider
   * Lock/unlock card
   * Background color (via `ngx-color-picker`)
3. Persist `CardStyle` changes to backend.

Deliverable: You can visually tune each card’s radius/color and lock independently.

---

### Phase 5 – Icons & catalogs

1. Backend:

   * Add `/api/catalog/popular` and `/api/catalog/icons?q=` endpoints.
   * Implement caching & mapping from external APIs (UnRAID/TrueNAS) as available.
   * Seed local static catalog as fallback.
2. Frontend:

   * Icon picker dialog in Design Mode.
   * Card preview updates icon instantly.

Deliverable: You can search/choose service icons or pick from popular ones.

---

### Phase 6 – Backgrounds (theme, color, upload, Pexels)

1. Backend:

   * File upload endpoint for images.
   * Pexels search proxy endpoint.
2. Theme designer:

   * Background mode toggle (theme default / color / image / Pexels).
   * `ngx-color-picker` for background color.
3. Board view applies chosen background with optional blur & overlay.

Deliverable: Boards can look dramatically different via background customization alone.

---

### Phase 7 – Advanced AuthZ and roles UI

1. Implement role management:

   * `/api/roles` CRUD (restricted to admins)
   * Assign roles to users in admin panel.
2. Permission-based controls:

   * `*hasPermission` structural directive for buttons/controls.
3. Granular permissions:

   * `board:view`, `board:edit`, `board:design`, `theme:edit`, etc.

Deliverable: Non-technical family members get “viewer” roles; you get “admin/designer” and see extra tools.

---

### Phase 8 – Polish, docs, and contributor UX

1. Add **Onboarding wizard**:

   * Create the first board
   * Pick a theme
   * Add a couple of link cards (Plex, Sonarr, etc.)
2. Write `README`, `CONTRIBUTING`, and “How to add a card type / theme / style mode” docs.
3. Add sample configs and demo theme packs.