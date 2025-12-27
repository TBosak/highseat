import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index';
import { appSettings } from '../db/schema';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { eq } from 'drizzle-orm';
import { AuthEnv } from '../types';

const settingsRouter = new Hono<AuthEnv>();

settingsRouter.use('*', authMiddleware);

const updateGlobalCssSchema = z.object({
  globalCustomCss: z.string().nullable()
});

// Get global settings
settingsRouter.get('/', requirePermission('board:view'), async (c) => {
  const [settings] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 'global'))
    .limit(1);

  // Return empty object if no settings exist yet
  if (!settings) {
    return c.json({
      id: 'global',
      globalCustomCss: null
    });
  }

  return c.json(settings);
});

// Update global custom CSS
settingsRouter.patch(
  '/custom-css',
  requirePermission('board:design'),
  zValidator('json', updateGlobalCssSchema),
  async (c) => {
    const { globalCustomCss } = c.req.valid('json');

    // Upsert settings
    const [settings] = await db
      .insert(appSettings)
      .values({
        id: 'global',
        globalCustomCss,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: {
          globalCustomCss,
          updatedAt: new Date()
        }
      })
      .returning();

    return c.json(settings);
  }
);

export default settingsRouter;
