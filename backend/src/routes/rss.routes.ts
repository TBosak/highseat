import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { fetchRssFeed, isValidFeedUrl } from '../services/rss.service';
import type { AuthEnv } from '../types';

const app = new Hono<AuthEnv>();

// Validation schema for RSS feed fetch request
const fetchSchema = z.object({
  url: z.string().url(),
  limit: z.number().int().positive().max(50).optional()
});

/**
 * Fetch and parse an RSS feed
 * POST /api/rss/fetch
 */
app.post('/fetch', zValidator('json', fetchSchema), async (c) => {
  try {
    const { url, limit } = c.req.valid('json');

    // Validate URL
    if (!isValidFeedUrl(url)) {
      return c.json({ error: 'Invalid RSS feed URL' }, 400);
    }

    // Fetch and parse the feed
    const feed = await fetchRssFeed(url, limit || 10);

    return c.json(feed);
  } catch (error) {
    console.error('[RSS API] Fetch feed error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to fetch RSS feed'
    }, 500);
  }
});

/**
 * Test RSS feed URL (validate it's accessible)
 * POST /api/rss/test
 */
app.post('/test', async (c) => {
  try {
    const body = await c.req.json();
    const { url } = body;

    if (!url) {
      return c.json({ error: 'Feed URL is required' }, 400);
    }

    // Validate URL format
    if (!isValidFeedUrl(url)) {
      return c.json({ valid: false, error: 'Invalid URL format' });
    }

    // Try to fetch the feed
    try {
      await fetchRssFeed(url, 1);
      return c.json({ valid: true });
    } catch (error) {
      return c.json({
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to fetch feed'
      });
    }
  } catch (error) {
    console.error('[RSS API] Test feed error:', error);
    return c.json({ error: 'Failed to test RSS feed' }, 500);
  }
});

export default app;
