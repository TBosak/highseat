import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index';
import { cards, zones, tabs, boards } from '../db/schema';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { eq, like, or } from 'drizzle-orm';
import { AuthEnv } from '../types';

const cardsRouter = new Hono<AuthEnv>();

cardsRouter.use('*', authMiddleware);

const createCardSchema = z.object({
  zoneId: z.string(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  serviceType: z.string().optional(),
  iconSource: z.enum(['catalog', 'custom']).optional(),
  iconCatalogId: z.string().optional(),
  iconCustomUrl: z.string().optional(),
  meta: z.record(z.any()).optional(),
  widgets: z.array(z.object({
    type: z.string(),
    config: z.record(z.any())
  })).optional(),
  layoutX: z.number().int().default(0),
  layoutY: z.number().int().default(0),
  layoutW: z.number().int().default(1),
  layoutH: z.number().int().default(1),
  layoutLocked: z.boolean().optional()
});

const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  serviceType: z.string().optional(),
  widgets: z.array(z.object({
    type: z.string(),
    config: z.record(z.any())
  })).optional()
});

const updateCardLayoutSchema = z.object({
  layoutX: z.number().int().optional(),
  layoutY: z.number().int().optional(),
  layoutW: z.number().int().optional(),
  layoutH: z.number().int().optional(),
  layoutLocked: z.boolean().optional()
});

const updateCardStyleSchema = z.object({
  style: z.record(z.any())
});

// Search cards across all boards
cardsRouter.get('/search', requirePermission('board:view'), async (c) => {
  const query = c.req.query('q');

  if (!query) {
    return c.json([]);
  }

  // Join cards with zones, tabs, and boards to get full context
  const results = await db
    .select({
      id: cards.id,
      title: cards.title,
      subtitle: cards.subtitle,
      meta: cards.meta,
      widgets: cards.widgets,
      boardName: boards.name,
      boardSlug: boards.slug,
      tabName: tabs.name,
      zoneName: zones.name
    })
    .from(cards)
    .innerJoin(zones, eq(cards.zoneId, zones.id))
    .innerJoin(tabs, eq(zones.tabId, tabs.id))
    .innerJoin(boards, eq(tabs.boardId, boards.id))
    .where(
      or(
        like(cards.title, `%${query}%`),
        like(cards.subtitle, `%${query}%`)
      )
    );

  // Parse meta field if it's a string
  const parsedResults = results.map(card => ({
    ...card,
    meta: card.meta && typeof card.meta === 'string' ? JSON.parse(card.meta) : card.meta
  }));

  return c.json(parsedResults);
});

// Get cards for a zone
cardsRouter.get('/zone/:zoneId', requirePermission('board:view'), async (c) => {
  const zoneId = c.req.param('zoneId');

  const zoneCards = await db
    .select()
    .from(cards)
    .where(eq(cards.zoneId, zoneId));

  // Parse JSON fields before returning
  const parsedCards = zoneCards.map(card => {
    console.log('[GET /zone/:zoneId] Card:', card.id, '| widgets type:', typeof card.widgets, '| value:', card.widgets);

    let parsedMeta = undefined;
    let parsedWidgets = undefined;

    if (card.meta && typeof card.meta === 'string') {
      try {
        parsedMeta = JSON.parse(card.meta);
      } catch (e) {
        console.error('Failed to parse meta:', e);
      }
    }

    if (card.widgets && typeof card.widgets === 'string') {
      console.log('[GET /zone/:zoneId] Parsing widgets for card:', card.id);
      try {
        parsedWidgets = JSON.parse(card.widgets);
        console.log('[GET /zone/:zoneId] Successfully parsed widgets:', parsedWidgets);
      } catch (e) {
        console.error('[GET /zone/:zoneId] Failed to parse widgets:', e);
      }
    }

    return {
      ...card,
      meta: parsedMeta,
      widgets: parsedWidgets
    };
  });

  return c.json(parsedCards);
});

// Get single card
cardsRouter.get('/:cardId', requirePermission('board:view'), async (c) => {
  const cardId = c.req.param('cardId');

  const [card] = await db
    .select()
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);

  if (!card) {
    return c.json({ error: 'Card not found' }, 404);
  }

  // Parse JSON fields before returning
  let parsedMeta = undefined;
  let parsedWidgets = undefined;

  if (card.meta && typeof card.meta === 'string') {
    try {
      parsedMeta = JSON.parse(card.meta);
    } catch (e) {
      console.error('Failed to parse meta:', e);
    }
  }

  if (card.widgets && typeof card.widgets === 'string') {
    try {
      parsedWidgets = JSON.parse(card.widgets);
    } catch (e) {
      console.error('Failed to parse widgets:', e);
    }
  }

  return c.json({
    ...card,
    meta: parsedMeta,
    widgets: parsedWidgets
  });
});

// Create card
cardsRouter.post('/', requirePermission('card:add'), zValidator('json', createCardSchema), async (c) => {
  const data = c.req.valid('json');

  // Serialize meta and widgets if present
  const cardData: any = { ...data };
  if (data.meta) {
    cardData.meta = JSON.stringify(data.meta);
  }
  if (data.widgets) {
    cardData.widgets = JSON.stringify(data.widgets);
    console.log('[POST /] Serializing widgets:', data.widgets);
  }

  const [card] = await db.insert(cards).values(cardData).returning();

  // Parse JSON fields before returning
  let parsedMeta = undefined;
  let parsedWidgets = undefined;

  if (card.meta && typeof card.meta === 'string') {
    try {
      parsedMeta = JSON.parse(card.meta);
    } catch (e) {
      console.error('Failed to parse meta:', e);
    }
  }

  if (card.widgets && typeof card.widgets === 'string') {
    try {
      parsedWidgets = JSON.parse(card.widgets);
    } catch (e) {
      console.error('Failed to parse widgets:', e);
    }
  }

  return c.json({
    ...card,
    meta: parsedMeta,
    widgets: parsedWidgets
  }, 201);
});

// Update card
cardsRouter.patch('/:cardId', requirePermission('card:edit'), zValidator('json', updateCardSchema), async (c) => {
  const cardId = c.req.param('cardId');
  const data = c.req.valid('json');

  // Serialize widgets if present
  const updateData: any = { ...data, updatedAt: new Date() };
  if (data.widgets) {
    updateData.widgets = JSON.stringify(data.widgets);
    console.log('[PATCH /:cardId] Serializing widgets:', data.widgets);
  }

  const [card] = await db
    .update(cards)
    .set(updateData)
    .where(eq(cards.id, cardId))
    .returning();

  if (!card) {
    return c.json({ error: 'Card not found' }, 404);
  }

  // Parse JSON fields before returning
  let parsedMeta = undefined;
  let parsedWidgets = undefined;

  if (card.meta && typeof card.meta === 'string') {
    try {
      parsedMeta = JSON.parse(card.meta);
    } catch (e) {
      console.error('Failed to parse meta:', e);
    }
  }

  if (card.widgets && typeof card.widgets === 'string') {
    try {
      parsedWidgets = JSON.parse(card.widgets);
    } catch (e) {
      console.error('Failed to parse widgets:', e);
    }
  }

  return c.json({
    ...card,
    meta: parsedMeta,
    widgets: parsedWidgets
  });
});

// Update card layout
cardsRouter.patch('/:cardId/layout', requirePermission('board:edit'), zValidator('json', updateCardLayoutSchema), async (c) => {
  const cardId = c.req.param('cardId');
  const data = c.req.valid('json');

  const [card] = await db
    .update(cards)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(cards.id, cardId))
    .returning();

  if (!card) {
    return c.json({ error: 'Card not found' }, 404);
  }

  return c.json(card);
});

// Update card style
cardsRouter.patch('/:cardId/style', requirePermission('board:design'), zValidator('json', updateCardStyleSchema), async (c) => {
  const cardId = c.req.param('cardId');
  const { style } = c.req.valid('json');

  const [card] = await db
    .update(cards)
    .set({
      style: JSON.stringify(style),
      updatedAt: new Date()
    })
    .where(eq(cards.id, cardId))
    .returning();

  if (!card) {
    return c.json({ error: 'Card not found' }, 404);
  }

  return c.json(card);
});

// Delete card
cardsRouter.delete('/:cardId', requirePermission('card:delete'), async (c) => {
  const cardId = c.req.param('cardId');

  const result = await db
    .delete(cards)
    .where(eq(cards.id, cardId))
    .returning();

  if (result.length === 0) {
    return c.json({ error: 'Card not found' }, 404);
  }

  return c.json({ message: 'Card deleted' });
});

export default cardsRouter;
