import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { jellyfinService } from '../services/jellyfin.service';
import { authMiddleware } from '../middleware/auth.middleware';
import type { AuthEnv } from '../types';

const jellyfin = new Hono<AuthEnv>();

const jellyfinConfigSchema = z.object({
  url: z.string().url(),
  apiKey: z.string().min(1),
  recentLimit: z.number().optional().default(10)
});

// Get all Jellyfin data (sessions, recent, stats, info) in one call
jellyfin.post('/all', authMiddleware, zValidator('json', jellyfinConfigSchema), async (c) => {
  try {
    const { url, apiKey, recentLimit } = c.req.valid('json');

    // Fetch all data in parallel
    const [sessions, recent, stats, info] = await Promise.all([
      jellyfinService.getActiveSessions({ url, apiKey }),
      jellyfinService.getRecentlyAdded({ url, apiKey }, recentLimit || 10),
      jellyfinService.getLibraryStats({ url, apiKey }),
      jellyfinService.getServerInfo({ url, apiKey })
    ]);

    // Transform sessions to include image URLs
    const sessionsWithImages = sessions.map(session => ({
      ...session,
      imageUrl: session.NowPlayingItem?.ImageTags?.Primary
        ? jellyfinService.getImageUrl(
            { url, apiKey },
            session.NowPlayingItem.Id,
            session.NowPlayingItem.ImageTags.Primary
          )
        : null
    }));

    // Transform recent items to include image URLs
    const recentWithImages = recent.map(item => ({
      ...item,
      imageUrl: item.ImageTags?.Primary
        ? jellyfinService.getImageUrl({ url, apiKey }, item.Id, item.ImageTags.Primary)
        : null
    }));

    return c.json({
      sessions: sessionsWithImages,
      recent: recentWithImages,
      stats,
      info
    });
  } catch (error) {
    console.error('Error fetching Jellyfin data:', error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Test connection endpoint
jellyfin.post('/test', authMiddleware, zValidator('json', jellyfinConfigSchema), async (c) => {
  try {
    const { url, apiKey } = c.req.valid('json');
    const info = await jellyfinService.getServerInfo({ url, apiKey });
    return c.json({ success: true, serverName: info.ServerName, version: info.Version });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 400);
  }
});

export default jellyfin;
