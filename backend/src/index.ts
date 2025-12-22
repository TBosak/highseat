import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
import { bodyLimit } from 'hono/body-limit';

import authRoutes from './routes/auth.routes';
import boardsRoutes from './routes/boards.routes';
import tabsRoutes from './routes/tabs.routes';
import cardsRoutes from './routes/cards.routes';
import themesRoutes from './routes/themes.routes';
import usersRoutes from './routes/users.routes';
import uploadsRoutes from './routes/uploads.routes';
import rolesRoutes from './routes/roles.routes';
import servicesRoutes from './routes/services.routes';
import systemRoutes from './routes/system.routes';
import plexRoutes from './routes/plex.routes';
import jellyfinRoutes from './routes/jellyfin.routes';
import { securityHeaders } from './middleware/security.middleware';
import { websocketService } from './services/websocket.service';
import type { AuthEnv } from './types';

// Validate critical environment variables on startup
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ SECURITY ERROR: JWT_SECRET environment variable is not set!');
  console.error('   Please set a strong, random JWT_SECRET in your .env file.');
  console.error('   Generate one with: openssl rand -base64 32');
  console.error('   Example: JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'));
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET is shorter than 32 characters. Consider using a longer secret for better security.');
}

const app = new Hono<AuthEnv>();

const staticRoot = '../frontend/dist/browser/browser';

// Parse allowed CORS origins from environment variable
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:4200', 'http://localhost:3350'];

console.log('🔒 CORS allowed origins:', allowedOrigins);

// Middleware
app.use('*', logger());

// Security headers - must come before other middleware
app.use('*', securityHeaders());

// Request size limit - prevent DoS attacks (10MB default, configurable)
const maxRequestSize = parseInt(process.env.UPLOAD_MAX_SIZE || '10485760'); // 10MB default
app.use('*', bodyLimit({
  maxSize: maxRequestSize,
  onError: (c) => {
    return c.json({ error: 'Request body too large' }, 413);
  }
}));

// CORS configuration with specific allowed origins
app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (e.g., mobile apps, curl)
    if (!origin) return null;

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // In development, be more lenient
    if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
      return origin;
    }

    // Reject all other origins
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket upgrade is handled in the server configuration below
// This route is just a fallback for non-upgrade requests
app.get('/ws', (c) => {
  return c.text('WebSocket endpoint - use ws:// protocol to connect', 400);
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/boards', boardsRoutes);
app.route('/api/tabs', tabsRoutes);
app.route('/api/cards', cardsRoutes);
app.route('/api/themes', themesRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/uploads', uploadsRoutes);
app.route('/api/roles', rolesRoutes);
app.route('/api/services', servicesRoutes);
app.route('/api/system', systemRoutes);
app.route('/api/plex', plexRoutes);
app.route('/api/jellyfin', jellyfinRoutes);

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }));

// Serve static files (Angular build)
app.use('/assets/*', serveStatic({ root: staticRoot }));

app.use('/*', serveStatic({
  root: staticRoot,
  rewriteRequestPath: (path) => {
    // Don't touch API
    if (path.startsWith('/api/')) {
      return path;
    }

    // If the path looks like a file (has an extension), serve it as-is
    if (/\.[a-zA-Z0-9]+$/.test(path)) {
      return path;
    }

    // Otherwise, it's probably an Angular route -> serve index.html
    return '/index.html';
  },
}));

// You *probably* don't need this extra fallback anymore,
// but if you want to keep it, move it AFTER the static handler above
// and let it just serve index.html:
app.get('/*', serveStatic({
  path: '../frontend/dist/browser/browser/index.html',
}));

const port = parseInt(process.env.PORT || '3350');

// Start WebSocket broadcasting
websocketService.startBroadcasting();

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📡 WebSocket available at ws://localhost:${port}/ws`);

// Wrap fetch handler to support WebSocket upgrades
const fetch = (req: Request, server: any) => {
  const url = new URL(req.url);

  // Handle WebSocket upgrade requests
  if (url.pathname === '/ws') {
    if (server.upgrade(req, {
      data: { createdAt: new Date() }
    })) {
      return; // WebSocket upgrade successful
    }
    // Upgrade failed, let Hono handle it
  }

  // Handle regular HTTP requests with Hono
  return app.fetch(req, { server });
};

export default {
  port,
  fetch,
  websocket: {
    open(ws) {
      websocketService.handleConnection(ws);
    },
    message(ws, message) {
      websocketService.handleMessage(ws, message.toString());
    },
    close(ws) {
      websocketService.handleDisconnection(ws);
    },
  },
};
