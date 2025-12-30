<p align="center">
  
<img width="200px" height="200px" src="https://github.com/TBosak/highseat/blob/main/frontend/public/header.png?raw=true">

<h1 align="center"> Highseat </h1>

</p>

<p align="center">A highly customizable grid-based homelab dashboard.</p>



## Stack

- **Frontend:** Angular 21
- **Backend:** Bun & Hono
- **Database:** SQLite & Drizzle

## Features

### Core Features
- 📊 **Multi-Board System** - Organize services across multiple boards with tabs
- 🎨 **Design Mode** - Customize layouts, colors, borders, and icons visually
- 🌈 **Base16/Base24 Theming** - Multiple style modes (glassmorphic, neobrutal, minimal, clay)
- 🖼️ **Custom Backgrounds** - Color, image upload, or Pexels integration
- 🔐 **JWT Authentication** - Secure login with refresh tokens
- 👥 **RBAC** - Role-based access control (Admin, Designer, Editor, Viewer)
- 📱 **Responsive Grid** - Drag & drop cards with resize support
- 🔌 **Service Catalogs** - Icon integration of popular self-hosted services

### Widgets
- 📝 **Note Widget** - Rich text editor with auto-save and formatting support
- 🕐 **Clock Widget** - Digital or analog clock with customizable time formats
- 💻 **System Metrics** - Real-time CPU, RAM, and disk usage monitoring
- 🌐 **Network Stats** - Live network throughput and interface statistics
- ⚙️ **Process Monitor** - Top running processes with CPU and memory usage
- 🎬 **Plex Integration** - Now playing and recently added media from Plex
- 🎞️ **Jellyfin Integration** - Now playing and recently added media from Jellyfin

### Advanced Features
- 🔄 **WebSocket Support** - Real-time system metrics updates
- 🔍 **Service Discovery** - Automatic detection of local network services

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Node.js 18+ (for Angular CLI)

### Installation

1. Clone the repository and install dependencies:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
bun install

# Install frontend dependencies
cd ../frontend
npm install
```

2. Set up the backend environment:

```bash
cd backend
cp .env.example .env
# Edit .env and set your JWT_SECRET
```

3. Initialize the database:

```bash
cd backend
bun run db:migrate
bun run db:seed
```

### Development

Run both frontend and backend in development mode:

```bash
# From project root
npm run dev
```

Or run them separately:

```bash
# Backend only (port 3350)
npm run dev:backend

# Frontend only (port 4200)
npm run dev:frontend
```

### Production Build

```bash
# Build everything
npm run build

# Start production server
npm start
```

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

## Widgets

Highseat supports interactive widgets that can be added to your dashboard alongside traditional service cards.

### Available Widgets

**Clock Widget**
- Digital or analog display
- 12-hour or 24-hour format (digital only)
- Optional seconds and date display
- Default size: 3×2 (digital) or 2×3 (analog)

**Note Widget**
- Rich text editor with formatting toolbar
- Auto-save every 2 seconds
- Supports headings, lists, and text styling
- Default size: 2×2, expandable

**System Monitoring Widgets**
- **System Metrics**: CPU, RAM, and disk usage with color-coded indicators
- **Network Stats**: Real-time upload/download speeds and interface statistics
- **Process Monitor**: Top 10 processes by CPU usage with memory information
- All system widgets use WebSocket for real-time updates

**Media Server Widgets**
- **Plex**: Library stats, now playing, and recent additions (requires Plex server URL and token)
- **Jellyfin**: Library stats, now playing, and recent additions (requires Jellyfin server URL and API key)
- Auto-refresh every 10 seconds
- Compact scrollable interface

### Adding Widgets

1. Click "Add Card" on any board
2. Select "Widget" as the card type
3. Choose your desired widget from the list
4. Configure widget-specific settings (if applicable)
5. Click "Add Card"

Widgets are ordered by simplicity in the selection interface, with service-specific widgets (Plex, Jellyfin) appearing at the bottom.

## Project Structure

```
homelab-dash/
├── backend/                 # Hono API server
│   ├── src/
│   │   ├── db/             # Database schema and migrations
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Auth and permission middleware
│   │   ├── services/       # Business logic (Plex, Jellyfin, system info, WebSocket)
│   │   ├── workers/        # Background workers (system metrics)
│   │   └── types/          # TypeScript type definitions
│   └── drizzle/            # Database migrations
├── frontend/               # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/      # Services, guards, interceptors
│   │   │   ├── shared/    # Reusable components
│   │   │   ├── features/  # Feature modules
│   │   │   │   ├── widgets/  # Widget components (note, clock, system, media)
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── public/
│   │       ├── app-icons/  # Service icon catalog
│   │       ├── base16/     # Base16 color schemes
│   │       └── base24/     # Base24 color schemes
│   └── dist/              # Build output
├── docker-compose.yml     # Docker deployment configuration
└── package.json           # Workspace configuration
```

## Default Roles

- **Viewer** - Can only view boards
- **Editor** - Can view and edit board content
- **Designer** - Can view, edit, and customize design
- **Admin** - Full access to all features

## License

MIT
