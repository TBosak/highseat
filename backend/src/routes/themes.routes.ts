import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index';
import { themes } from '../db/schema';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { eq } from 'drizzle-orm';
import { AuthEnv } from '../types';

const themesRouter = new Hono<AuthEnv>();

themesRouter.use('*', authMiddleware);

const createThemeSchema = z.object({
  name: z.string().min(1),
  author: z.string().optional(),
  variant: z.enum(['dark', 'light']).optional(),
  isCustom: z.boolean().optional(),
  baseScheme: z.enum(['base16', 'base24']).default('base16'),
  tokens: z.record(z.string()),
  styleMode: z.enum(['glassmorphic', 'neobrutal', 'minimal', 'clay', 'custom']).default('glassmorphic'),
  useGlobalBackground: z.boolean().default(true),
  backgroundType: z.enum(['color', 'image', 'pexels']).optional(),
  backgroundValue: z.string().optional(),
  backgroundBlur: z.number().optional(),
  backgroundOpacity: z.number().optional()
});

// Get all themes
themesRouter.get('/', async (c) => {
  const allThemes = await db.select().from(themes);
  return c.json(allThemes);
});

// Get custom themes only (for theme browser to merge with bundled themes)
themesRouter.get('/custom', async (c) => {
  const customThemes = await db
    .select()
    .from(themes)
    .where(eq(themes.isCustom, true));

  return c.json(customThemes);
});

// Get single theme
themesRouter.get('/:themeId', async (c) => {
  const themeId = c.req.param('themeId');

  const [theme] = await db
    .select()
    .from(themes)
    .where(eq(themes.id, themeId))
    .limit(1);

  if (!theme) {
    return c.json({ error: 'Theme not found' }, 404);
  }

  return c.json(theme);
});

// Create theme
themesRouter.post('/', requirePermission('theme:edit'), zValidator('json', createThemeSchema), async (c) => {
  const data = c.req.valid('json');

  const [theme] = await db.insert(themes).values({
    ...data,
    tokens: JSON.stringify(data.tokens)
  }).returning();

  return c.json(theme, 201);
});

// Update theme
themesRouter.patch('/:themeId', requirePermission('theme:edit'), zValidator('json', createThemeSchema.partial()), async (c) => {
  const themeId = c.req.param('themeId');
  const data = c.req.valid('json');

  const updateData: any = { ...data };
  if (data.tokens) {
    updateData.tokens = JSON.stringify(data.tokens);
  }

  const [theme] = await db
    .update(themes)
    .set(updateData)
    .where(eq(themes.id, themeId))
    .returning();

  if (!theme) {
    return c.json({ error: 'Theme not found' }, 404);
  }

  return c.json(theme);
});

// Delete theme
themesRouter.delete('/:themeId', requirePermission('theme:edit'), async (c) => {
  const themeId = c.req.param('themeId');

  const result = await db
    .delete(themes)
    .where(eq(themes.id, themeId))
    .returning();

  if (result.length === 0) {
    return c.json({ error: 'Theme not found' }, 404);
  }

  return c.json({ message: 'Theme deleted' });
});

export default themesRouter;
