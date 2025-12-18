# Highseat

A self-hosted, grid-based homelab dashboard with tabs, design mode, theming, and RBAC.

## Stack

- **Frontend:** Angular (latest) with standalone components, Signals, and Angular CDK
- **Backend:** Bun runtime with Hono framework
- **Database:** SQLite with Drizzle ORM
- **UI:** Angular CDK DragDrop, CSS Grid, and highly customizable themes

## Features

- 📊 **Multi-Board System** - Organize services across multiple boards with tabs
- 🎨 **Design Mode** - Customize layouts, colors, borders, and icons visually
- 🌈 **Base16/Base24 Theming** - Multiple style modes (glassmorphic, neobrutal, minimal, clay)
- 🖼️ **Custom Backgrounds** - Color, image upload, or Pexels integration
- 🔐 **JWT Authentication** - Secure login with refresh tokens
- 👥 **RBAC** - Role-based access control (Admin, Designer, Editor, Viewer)
- 📱 **Responsive Grid** - Drag & drop cards with resize support
- 🔌 **Service Catalogs** - Icon integration of popular self-hosted services

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Node.js 18+ (for Angular CLI)

### Installation

1. Clone the repository and install dependencies:

\`\`\`bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
bun install

# Install frontend dependencies
cd ../frontend
npm install
\`\`\`

2. Set up the backend environment:

\`\`\`bash
cd backend
cp .env.example .env
# Edit .env and set your JWT_SECRET
\`\`\`

3. Initialize the database:

\`\`\`bash
cd backend
bun run db:migrate
bun run db:seed
\`\`\`

This will create an admin user:
- Email: `admin@homelab.local`
- Password: `admin123`

### Development

Run both frontend and backend in development mode:

\`\`\`bash
# From project root
npm run dev
\`\`\`

Or run them separately:

\`\`\`bash
# Backend only (port 3350)
npm run dev:backend

# Frontend only (port 4200)
npm run dev:frontend
\`\`\`

### Production Build

\`\`\`bash
# Build everything
npm run build

# Start production server
npm start
\`\`\`

The Hono server will serve the compiled Angular app on port 3350.

## Docker Deployment

Highseat can be deployed using Docker for easier setup and portability.

### Quick Docker Start

```bash
# Create environment file
cp .env.example .env

# Edit .env and set JWT_SECRET (required)
nano .env

# Build and start with Docker Compose
docker-compose up -d

# Access the application
# http://localhost:3350
```

The default admin user will be created automatically:
- Email: `admin@homelab.local`
- Password: `admin123`

For detailed Docker configuration, volume management, reverse proxy setup, and troubleshooting, see [DOCKER.md](DOCKER.md).

### Docker Features

- 🐳 Single container with frontend and backend
- 💾 Persistent data volumes for database and uploads
- 🔄 Automatic health checks and restart policies
- 📊 Optional Docker host system monitoring
- 🔒 Secure by default with JWT authentication

## Project Structure

\`\`\`
homelab-dash/
├── backend/                 # Hono API server
│   ├── src/
│   │   ├── db/             # Database schema and migrations
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Auth and permission middleware
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript type definitions
│   └── drizzle/            # Database migrations
├── frontend/               # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/      # Services, guards, interceptors
│   │   │   ├── shared/    # Reusable components
│   │   │   ├── features/  # Feature modules
│   │   │   └── ...
│   └── dist/              # Build output
└── package.json           # Workspace configuration
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout and revoke refresh token

### Boards
- `GET /api/boards` - List all boards
- `POST /api/boards` - Create new board
- `GET /api/boards/:id` - Get board with tabs
- `PATCH /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

### Tabs
- `GET /api/tabs/board/:boardId` - List tabs for board
- `POST /api/tabs` - Create new tab
- `GET /api/tabs/:id` - Get tab with zones and cards
- `PATCH /api/tabs/:id` - Update tab
- `DELETE /api/tabs/:id` - Delete tab

### Cards
- `GET /api/cards/zone/:zoneId` - List cards in zone
- `POST /api/cards` - Create new card
- `GET /api/cards/:id` - Get card details
- `PATCH /api/cards/:id` - Update card content
- `PATCH /api/cards/:id/layout` - Update card layout
- `PATCH /api/cards/:id/style` - Update card style (requires design permission)
- `DELETE /api/cards/:id` - Delete card

### Themes
- `GET /api/themes` - List all themes
- `POST /api/themes` - Create new theme (requires theme:edit)
- `GET /api/themes/:id` - Get theme details
- `PATCH /api/themes/:id` - Update theme
- `DELETE /api/themes/:id` - Delete theme

## Permissions

- `board:view` - View boards
- `board:edit` - Edit board structure and settings
- `board:design` - Access design mode and card styling
- `card:add` - Add new cards
- `card:edit` - Edit card content
- `card:delete` - Delete cards
- `theme:edit` - Create and edit themes
- `role:manage` - Manage user roles
- `user:manage` - Manage users

## Default Roles

- **Viewer** - Can only view boards
- **Editor** - Can view and edit board content
- **Designer** - Can view, edit, and customize design
- **Admin** - Full access to all features

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new features.

## License

MIT
