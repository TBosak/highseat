import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index';
import { tabs, zones } from '../db/schema';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { eq } from 'drizzle-orm';
import { AuthEnv } from '../types';

const tabsRouter = new Hono<AuthEnv>();

tabsRouter.use('*', authMiddleware);

const createTabSchema = z.object({
  boardId: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  order: z.number().int().min(0).default(0)
});

const updateTabSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  backgroundImage: z.string().nullable().optional(),
  backgroundBlur: z.number().int().min(0).max(100).nullable().optional(),
  backgroundOpacity: z.number().int().min(0).max(100).nullable().optional()
});

// Get all tabs for a board
tabsRouter.get('/board/:boardId', requirePermission('board:view'), async (c) => {
  const boardId = c.req.param('boardId');

  const boardTabs = await db
    .select()
    .from(tabs)
    .where(eq(tabs.boardId, boardId))
    .orderBy(tabs.order);

  return c.json(boardTabs);
});

// Get single tab with zones and cards
tabsRouter.get('/:tabId', requirePermission('board:view'), async (c) => {
  const tabId = c.req.param('tabId');

  const [tab] = await db
    .select()
    .from(tabs)
    .where(eq(tabs.id, tabId))
    .limit(1);

  if (!tab) {
    return c.json({ error: 'Tab not found' }, 404);
  }

  const tabZones = await db.query.zones.findMany({
    where: eq(zones.tabId, tabId),
    with: {
      cards: true
    },
    orderBy: (zones, { asc }) => [asc(zones.order)]
  });

  // Parse JSON fields in cards
  const parsedZones = tabZones.map(zone => ({
    ...zone,
    cards: zone.cards.map(card => {
      let parsedMeta = undefined;
      let parsedWidgets = undefined;

      if (card.meta && typeof card.meta === 'string') {
        try {
          parsedMeta = JSON.parse(card.meta);
        } catch (e) {
          console.error('Failed to parse meta for card:', card.id, e);
        }
      }

      if (card.widgets && typeof card.widgets === 'string') {
        console.log('[GET /tabs/:tabId] Parsing widgets for card:', card.id);
        try {
          parsedWidgets = JSON.parse(card.widgets);
          console.log('[GET /tabs/:tabId] Successfully parsed widgets:', parsedWidgets);
        } catch (e) {
          console.error('[GET /tabs/:tabId] Failed to parse widgets for card:', card.id, e);
        }
      }

      return {
        ...card,
        meta: parsedMeta,
        widgets: parsedWidgets
      };
    })
  }));

  return c.json({ ...tab, zones: parsedZones });
});

// Create tab
tabsRouter.post('/', requirePermission('board:edit'), zValidator('json', createTabSchema), async (c) => {
  const data = c.req.valid('json');

  const [tab] = await db.insert(tabs).values(data).returning();

  // Create a default zone in the new tab
  await db.insert(zones).values({
    tabId: tab.id,
    name: 'Default',
    order: 0
  });

  return c.json(tab, 201);
});

// Update tab
tabsRouter.patch('/:tabId', requirePermission('board:edit'), zValidator('json', updateTabSchema), async (c) => {
  const tabId = c.req.param('tabId');
  const data = c.req.valid('json');

  const [tab] = await db
    .update(tabs)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tabs.id, tabId))
    .returning();

  if (!tab) {
    return c.json({ error: 'Tab not found' }, 404);
  }

  return c.json(tab);
});

// Delete tab
tabsRouter.delete('/:tabId', requirePermission('board:edit'), async (c) => {
  const tabId = c.req.param('tabId');

  const result = await db
    .delete(tabs)
    .where(eq(tabs.id, tabId))
    .returning();

  if (result.length === 0) {
    return c.json({ error: 'Tab not found' }, 404);
  }

  return c.json({ message: 'Tab deleted' });
});

export default tabsRouter;
