import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { jellyfinService } from '../services/jellyfin.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { credentialsService } from '../services/credentials.service';
import type { AuthEnv } from '../types';

const jellyfin = new Hono<AuthEnv>();

const jellyfinConfigSchema = z.object({
  credentialId: z.string().min(1),
  recentLimit: z.number().optional().default(10)
});

// Get all Jellyfin data (sessions, recent, stats, info) in one call
jellyfin.post('/all', authMiddleware, zValidator('json', jellyfinConfigSchema), async (c) => {
  try {
    const userId = c.get('user').userId;
    const { credentialId, recentLimit } = c.req.valid('json');

    // Get credentials
    const credential = await credentialsService.getCredential(credentialId, userId);
    if (!credential) {
      return c.json({ error: 'Credential not found' }, 404);
    }

    let { serverUrl, apiKey } = credential.data as { serverUrl: string; apiKey: string };
    if (!serverUrl || !apiKey) {
      return c.json({ error: 'Invalid credential data' }, 400);
    }

    // Normalize URL by removing trailing slashes
    serverUrl = serverUrl.replace(/\/+$/, '');

    const url = serverUrl;

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
    const userId = c.get('user').userId;
    const { credentialId } = c.req.valid('json');

    // Get credentials
    const credential = await credentialsService.getCredential(credentialId, userId);
    if (!credential) {
      return c.json({ success: false, error: 'Credential not found' }, 404);
    }

    let { serverUrl, apiKey } = credential.data as { serverUrl: string; apiKey: string };
    if (!serverUrl || !apiKey) {
      return c.json({ success: false, error: 'Invalid credential data' }, 400);
    }

    // Normalize URL by removing trailing slashes
    serverUrl = serverUrl.replace(/\/+$/, '');

    const info = await jellyfinService.getServerInfo({ url: serverUrl, apiKey });
    return c.json({ success: true, serverName: info.ServerName, version: info.Version });
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 400);
  }
});

export default jellyfin;
