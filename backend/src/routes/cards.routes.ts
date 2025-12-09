import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index';
import { cards } from '../db/schema';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { eq } from 'drizzle-orm';
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
  layoutX: z.number().int().default(0),
  layoutY: z.number().int().default(0),
  layoutW: z.number().int().default(1),
  layoutH: z.number().int().default(1),
  layoutLocked: z.boolean().optional()
});

const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  serviceType: z.string().optional()
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

// Get cards for a zone
cardsRouter.get('/zone/:zoneId', requirePermission('board:view'), async (c) => {
  const zoneId = c.req.param('zoneId');

  const zoneCards = await db
    .select()
    .from(cards)
    .where(eq(cards.zoneId, zoneId));

  return c.json(zoneCards);
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

  return c.json(card);
});

// Create card
cardsRouter.post('/', requirePermission('card:add'), zValidator('json', createCardSchema), async (c) => {
  const data = c.req.valid('json');

  // Serialize meta if present
  const cardData: any = { ...data };
  if (data.meta) {
    cardData.meta = JSON.stringify(data.meta);
  }

  const [card] = await db.insert(cards).values(cardData).returning();

  return c.json(card, 201);
});

// Update card
cardsRouter.patch('/:cardId', requirePermission('card:edit'), zValidator('json', updateCardSchema), async (c) => {
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
