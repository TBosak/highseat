import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';

import authRoutes from './routes/auth.routes';
import boardsRoutes from './routes/boards.routes';
import tabsRoutes from './routes/tabs.routes';
import cardsRoutes from './routes/cards.routes';
import themesRoutes from './routes/themes.routes';
import usersRoutes from './routes/users.routes';
import uploadsRoutes from './routes/uploads.routes';
import type { AuthEnv } from './types';

const app = new Hono<AuthEnv>();

const staticRoot = '../frontend/dist/dash-frontend/browser';

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/boards', boardsRoutes);
app.route('/api/tabs', tabsRoutes);
app.route('/api/cards', cardsRoutes);
app.route('/api/themes', themesRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/uploads', uploadsRoutes);

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
  path: '../frontend/dist/dash-frontend/browser/index.html',
}));

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
