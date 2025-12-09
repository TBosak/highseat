# UI Components Created

All Angular UI components have been created successfully! Here's what was built:

## ✅ Authentication

### LoginComponent (`features/auth/login/`)
- **Features:**
  - Login and register modes (toggle between them)
  - Form validation with error messages
  - Loading states during authentication
  - Demo credentials display
  - Signals-based reactive state
  - Automatic navigation to `/boards` on success

**Files:**
- `login.component.ts` - Component logic with signals
- `login.component.html` - Template with control flow syntax (@if, @else)
- `login.component.scss` - Styled login card with glassmorphic design

---

## ✅ Dashboard

### BoardListComponent (`features/dashboard/board-list/`)
- **Features:**
  - Display all user boards in a grid
  - Create new boards with modal
  - Delete boards (with confirmation)
  - Auto-generate slugs from board names
  - Lock badge indicator
  - Permission-based UI (`*hasPermission` directive)
  - Navigate to board on click

**Files:**
- `board-list.component.ts` - Board management logic
- `board-list.component.html` - Grid layout with modal
- `board-list.component.scss` - Card-based board grid

### BoardViewComponent (`features/dashboard/board-view/`)
- **Features:**
  - Display board with multi-tab support
  - Tab bar for switching between tabs
  - Design mode toggle button
  - Board lock/unlock toggle
  - Theme application from board settings
  - Angular CDK drag & drop integration
  - Grid-based card layout
  - Sticky header with navigation
  - Empty state for new boards

**Files:**
- `board-view.component.ts` - Board view with tabs and cards
- `board-view.component.html` - Tab bar + card grid
- `board-view.component.scss` - Styled board view with backdrop

### DashCardComponent (`features/dashboard/components/dash-card/`)
- **Features:**
  - Display card with title, subtitle, icon, badge
  - Design mode toolbar (visible when design mode active)
  - Style editor panel:
    - Border radius slider (0-32px)
    - More controls can be added easily
  - Lock/unlock individual cards
  - Delete card (with confirmation)
  - Drag handle for repositioning
  - Dynamic styling from card.style object
  - Permission-based controls

**Files:**
- `dash-card.component.ts` - Card component with design features
- `dash-card.component.html` - Card content + toolbar
- `dash-card.component.scss` - Card styling with toolbar

---

## 🎨 Features Implemented

### Angular CDK Drag & Drop
- Integrated in `BoardViewComponent`
- Cards are draggable in design mode
- Disabled when board or card is locked
- Smooth animations with CDK drag preview
- `cdkDrag` and `cdkDropList` directives

### Design Mode
- Global design mode service (signals-based)
- Toggle button in board header
- Shows/hides card toolbars
- Shows/hides drag handles
- Visual indication (dashed outline)
- Permission-gated (`board:design`)

### Permission System
- `*hasPermission` structural directive
- Used throughout components
- Hides/shows UI based on user permissions
- Examples:
  - Create board button
  - Delete card button
  - Design mode toggle
  - Board lock toggle

### Theming
- Theme applied when board loads
- CSS variables set from theme tokens
- Multiple style modes support (glassmorphic, neobrutal, minimal, clay)
- Background support (color, image, Pexels)

---

## 🔌 Routing

Updated `app.routes.ts` with:
- `/login` - Public login page
- `/boards` - Protected board list (requires `board:view`)
- `/boards/:boardSlug/:tabSlug` - Protected board view
- Redirect root `/` to `/boards`
- 404 redirects to `/boards`
- Auth guard protection
- Permission-based route data

---

## 📦 Component Structure

```
frontend/src/app/
├── core/
│   ├── models/
│   │   └── index.ts              # All TypeScript interfaces
│   ├── services/
│   │   ├── auth.service.ts       # JWT auth with signals
│   │   ├── board.service.ts      # Board CRUD
│   │   ├── tab.service.ts        # Tab CRUD
│   │   ├── card.service.ts       # Card CRUD + styling
│   │   ├── theme.service.ts      # Theme management
│   │   └── design-mode.service.ts # Design mode state
│   ├── guards/
│   │   └── auth.guard.ts         # Route protection
│   └── interceptors/
│       └── auth.interceptor.ts   # Auto token injection
├── shared/
│   └── directives/
│       └── has-permission.directive.ts # Permission-based UI
└── features/
    ├── auth/
    │   └── login/                # Login component
    └── dashboard/
        ├── board-list/           # Board list component
        ├── board-view/           # Board view with tabs
        └── components/
            └── dash-card/        # Card component
```

---

## 🚀 Next Steps

### Ready to Run

All components are created! To run the app:

1. **Install dependencies:**
   ```bash
   cd frontend
   bun install
   bun add @angular/cdk ngx-color-picker
   ```

2. **Set up backend:**
   ```bash
   cd ../backend
   bun install
   bunx drizzle-kit generate
   bun run db:migrate
   bun run db:seed
   ```

3. **Run development servers:**
   ```bash
   # From project root
   bun run dev
   ```

4. **Access the app:**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000
   - Login with: `admin@homelab.local` / `admin123`

### Features to Add Later

These can be added incrementally:

- **Icon Picker Dialog** - Search and select service icons
- **Color Picker Integration** - Use ngx-color-picker for custom colors
- **Card Resize Handles** - Make cards resizable in design mode
- **Theme Editor UI** - Create/edit themes in the app
- **Admin Panel** - User and role management
- **Background Picker** - Choose backgrounds (color/image/Pexels)
- **Add Card Dialog** - Create new cards
- **Card Settings Modal** - Edit card title, subtitle, etc.
- **WebSocket Support** - Real-time multi-user updates

---

## 💡 Usage Tips

### Creating Cards (Manual for now)

Use the API directly to create cards:

```bash
# Get your access token after login
TOKEN="your-access-token"

# Get boards
curl http://localhost:3000/api/boards \
  -H "Authorization: Bearer $TOKEN"

# Get tabs for a board
curl http://localhost:3000/api/tabs/board/{BOARD_ID} \
  -H "Authorization: Bearer $TOKEN"

# Get tab details (includes zones)
curl http://localhost:3000/api/tabs/{TAB_ID} \
  -H "Authorization: Bearer $TOKEN"

# Create a card
curl -X POST http://localhost:3000/api/cards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "ZONE_ID",
    "title": "Plex",
    "subtitle": "Media Server",
    "serviceType": "plex",
    "layoutX": 0,
    "layoutY": 0,
    "layoutW": 1,
    "layoutH": 1
  }'
```

### Testing Design Mode

1. Create a board
2. Open the board
3. Click "Design Mode" button
4. Hover over cards to see toolbar
5. Use border radius slider
6. Drag cards to reposition
7. Lock/unlock individual cards
8. Click "Exit Design Mode" to save

### Permission Testing

Create users with different roles via API:

```bash
# Register as viewer
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "viewer@test.com",
    "password": "password123",
    "displayName": "Viewer User"
  }'
```

Then update their role in the database to test permissions.

---

## 🎨 Customization

### Adding New Style Modes

1. Add to `frontend/src/styles.scss`:
```scss
[data-style-mode="your-mode"] .card {
  // Your custom styles
}
```

2. Update theme `styleMode` type in `core/models/index.ts`

### Adding Card Types

Create new card widget components in `features/dashboard/components/` and use the `CardWidget` interface.

---

All components are complete and ready to use! 🎉
