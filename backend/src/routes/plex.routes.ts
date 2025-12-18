import { Hono } from 'hono';
import { plexService } from '../services/plex.service';
import type { AuthEnv } from '../types';

const app = new Hono<AuthEnv>();

/**
 * Test connection to Plex server
 * POST /api/plex/test
 */
app.post('/test', async (c) => {
  try {
    const body = await c.req.json();
    const { url, token } = body;

    if (!url || !token) {
      return c.json({ error: 'URL and token are required' }, 400);
    }

    const isConnected = await plexService.testConnection({ url, token });

    return c.json({ connected: isConnected });
  } catch (error) {
    console.error('[Plex API] Test connection error:', error);
    return c.json({ error: 'Failed to test connection' }, 500);
  }
});

/**
 * Get active sessions (currently playing)
 * POST /api/plex/sessions
 */
app.post('/sessions', async (c) => {
  try {
    const body = await c.req.json();
    const { url, token } = body;

    if (!url || !token) {
      return c.json({ error: 'URL and token are required' }, 400);
    }

    const sessions = await plexService.getActiveSessions({ url, token });

    return c.json({ sessions });
  } catch (error) {
    console.error('[Plex API] Get sessions error:', error);
    return c.json({ error: 'Failed to fetch sessions' }, 500);
  }
});

/**
 * Get recently added media
 * POST /api/plex/recent
 */
app.post('/recent', async (c) => {
  try {
    const body = await c.req.json();
    const { url, token, limit } = body;

    if (!url || !token) {
      return c.json({ error: 'URL and token are required' }, 400);
    }

    const recent = await plexService.getRecentlyAdded(
      { url, token },
      limit || 10
    );

    return c.json({ recent });
  } catch (error) {
    console.error('[Plex API] Get recent error:', error);
    return c.json({ error: 'Failed to fetch recent media' }, 500);
  }
});

/**
 * Get server information
 * POST /api/plex/info
 */
app.post('/info', async (c) => {
  try {
    const body = await c.req.json();
    const { url, token } = body;

    if (!url || !token) {
      return c.json({ error: 'URL and token are required' }, 400);
    }

    const info = await plexService.getServerInfo({ url, token });

    return c.json({ info });
  } catch (error) {
    console.error('[Plex API] Get info error:', error);
    return c.json({ error: 'Failed to fetch server info' }, 500);
  }
});

/**
 * Get all Plex data (sessions + recent + info)
 * POST /api/plex/all
 */
app.post('/all', async (c) => {
  try {
    const body = await c.req.json();
    const { url, token, recentLimit } = body;

    if (!url || !token) {
      return c.json({ error: 'URL and token are required' }, 400);
    }

    const [sessions, recent, info, stats] = await Promise.all([
      plexService.getActiveSessions({ url, token }),
      plexService.getRecentlyAdded({ url, token }, recentLimit || 10),
      plexService.getServerInfo({ url, token }),
      plexService.getLibraryStats({ url, token })
    ]);

    return c.json({ sessions, recent, info, stats });
  } catch (error) {
    console.error('[Plex API] Get all error:', error);
    return c.json({ error: 'Failed to fetch Plex data' }, 500);
  }
});

export default app;
