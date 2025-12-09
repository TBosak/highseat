import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index';
import { boards, tabs, zones, cards } from '../db/schema';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { eq, and } from 'drizzle-orm';
import { AuthEnv, type JWTPayload } from '../types';

const boardsRouter = new Hono<AuthEnv>();

boardsRouter.use('*', authMiddleware);

const createBoardSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  themeId: z.string().optional()
});

const updateBoardSchema = z.object({
  name: z.string().min(1).optional(),
  themeId: z.string().optional(),
  isLocked: z.boolean().optional()
});

// Get all boards for current user
boardsRouter.get('/', requirePermission('board:view'), async (c) => {
  const user = c.get('user') as JWTPayload;

  const userBoards = await db
    .select()
    .from(boards);
    // .where(eq(boards.createdBy, user.userId));

  return c.json(userBoards);
});

// Get single board with tabs
boardsRouter.get('/:boardId', requirePermission('board:view'), async (c) => {
  const boardId = c.req.param('boardId');
  const user = c.get('user') as JWTPayload;

  const [board] = await db
    .select()
    .from(boards)
    .where(and(
      eq(boards.id, boardId),
      // eq(boards.createdBy, user.userId)
    ))
    .limit(1);

  if (!board) {
    return c.json({ error: 'Board not found' }, 404);
  }

  const boardTabs = await db
    .select()
    .from(tabs)
    .where(eq(tabs.boardId, boardId))
    .orderBy(tabs.order);

  return c.json({ ...board, tabs: boardTabs });
});

// Create board
boardsRouter.post('/', requirePermission('board:edit'), zValidator('json', createBoardSchema), async (c) => {
  const user = c.get('user') as JWTPayload;
  const data = c.req.valid('json');

  const [board] = await db.insert(boards).values({
    ...data,
    createdBy: user.userId
  }).returning();

  // Create a default tab
  const [defaultTab] = await db.insert(tabs).values({
    boardId: board.id,
    name: 'Main',
    slug: 'main',
    order: 0
  }).returning();

  // Create a default zone in the tab
  await db.insert(zones).values({
    tabId: defaultTab.id,
    name: 'Default',
    order: 0
  });

  return c.json(board, 201);
});

// Update board
boardsRouter.patch('/:boardId', requirePermission('board:edit'), zValidator('json', updateBoardSchema), async (c) => {
  const boardId = c.req.param('boardId');
  const user = c.get('user') as JWTPayload;
  const data = c.req.valid('json');

  const [board] = await db
    .update(boards)
    .set({ ...data, updatedAt: new Date() })
    .where(and(
      eq(boards.id, boardId),
      eq(boards.createdBy, user.userId)
    ))
    .returning();

  if (!board) {
    return c.json({ error: 'Board not found' }, 404);
  }

  return c.json(board);
});

// Delete board
boardsRouter.delete('/:boardId', requirePermission('board:edit'), async (c) => {
  const boardId = c.req.param('boardId');
  const user = c.get('user') as JWTPayload;

  const result = await db
    .delete(boards)
    .where(and(
      eq(boards.id, boardId),
      eq(boards.createdBy, user.userId)
    ))
    .returning();

  if (result.length === 0) {
    return c.json({ error: 'Board not found' }, 404);
  }

  return c.json({ message: 'Board deleted' });
});

export default boardsRouter;
