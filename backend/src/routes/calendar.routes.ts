import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { fetchICSFeed, testICSFeed } from '../services/ics.service';
import { CalDAVService } from '../services/caldav.service';
import { credentialsService } from '../services/credentials.service';
import type { AuthEnv } from '../types';

const calendar = new Hono<AuthEnv>();

const icsConfigSchema = z.object({
  feedUrl: z.string().url(),
  name: z.string().optional(),
  color: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const caldavConfigSchema = z.object({
  credentialId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const caldavTestSchema = z.object({
  serverUrl: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1)
});

/**
 * Fetch events from ICS feed
 * POST /api/calendar/ics/fetch
 */
calendar.post('/ics/fetch', authMiddleware, zValidator('json', icsConfigSchema), async (c) => {
  try {
    const { feedUrl, name, color, startDate, endDate } = c.req.valid('json');

    const events = await fetchICSFeed(
      feedUrl,
      name,
      color,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return c.json({ success: true, events });
  } catch (error) {
    console.error('[Calendar API] ICS fetch error:', error);
    return c.json({ success: false, error: (error as Error).message, events: [] }, 500);
  }
});

/**
 * Test ICS feed connection
 * POST /api/calendar/ics/test
 */
calendar.post('/ics/test', authMiddleware, zValidator('json', z.object({ feedUrl: z.string().url() })), async (c) => {
  try {
    const { feedUrl } = c.req.valid('json');
    const isValid = await testICSFeed(feedUrl);

    return c.json({ success: isValid });
  } catch (error) {
    console.error('[Calendar API] ICS test error:', error);
    return c.json({ success: false, error: (error as Error).message }, 400);
  }
});

/**
 * Fetch events from CalDAV server using stored credentials
 * POST /api/calendar/caldav/fetch
 */
calendar.post('/caldav/fetch', authMiddleware, zValidator('json', caldavConfigSchema), async (c) => {
  try {
    const userId = c.get('user').userId;
    const { credentialId, startDate, endDate } = c.req.valid('json');

    // Retrieve the encrypted credential
    const credential = await credentialsService.getCredential(credentialId, userId);

    if (!credential) {
      return c.json({ success: false, error: 'Credential not found', events: [] }, 404);
    }

    // Extract CalDAV configuration from decrypted credential data
    const { serverUrl, username, password } = credential.data as {
      serverUrl: string;
      username: string;
      password: string;
    };

    const caldavService = new CalDAVService({
      serverUrl,
      username,
      password
    });

    const events = await caldavService.fetchEvents(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return c.json({ success: true, events });
  } catch (error) {
    console.error('[Calendar API] CalDAV fetch error:', error);
    return c.json({ success: false, error: (error as Error).message, events: [] }, 500);
  }
});

/**
 * Test CalDAV connection
 * POST /api/calendar/caldav/test
 */
calendar.post('/caldav/test', authMiddleware, zValidator('json', caldavTestSchema), async (c) => {
  try {
    const { serverUrl, username, password } = c.req.valid('json');

    const caldavService = new CalDAVService({
      serverUrl,
      username,
      password
    });

    const isValid = await caldavService.testConnection();

    return c.json({ success: isValid });
  } catch (error) {
    console.error('[Calendar API] CalDAV test error:', error);
    return c.json({ success: false, error: (error as Error).message }, 400);
  }
});

export default calendar;
