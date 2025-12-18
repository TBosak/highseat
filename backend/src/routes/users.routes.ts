import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { UserService } from '../services/user.service';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import type { AuthEnv, JWTPayload } from '../types';
import { db } from '../db/index';
import { users as usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const users = new Hono<AuthEnv>();

const updateThemePreferenceSchema = z.object({
  preferredThemeId: z.string(),
  preferredStyleMode: z.string().optional()
});

const updateUserPreferencesSchema = z.object({
  hideLogo: z.boolean().optional()
});

const createUserSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(8),
  displayName: z.string().optional(),
  roles: z.array(z.string()).default(['viewer'])
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  password: z.string().min(8).optional(),
  displayName: z.string().optional(),
  roles: z.array(z.string()).optional()
});

// Update user's theme preference
users.patch('/me/theme-preference', authMiddleware, zValidator('json', updateThemePreferenceSchema), async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const { preferredThemeId, preferredStyleMode } = c.req.valid('json');

    const updatedUser = await UserService.updateThemePreference(
      user.userId,
      preferredThemeId,
      preferredStyleMode
    );

    // Return user data with parsed roles and theme preferences
    return c.json({
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      roles: JSON.parse(updatedUser.roles),
      preferredThemeId: updatedUser.preferredThemeId,
      preferredStyleMode: updatedUser.preferredStyleMode
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

// Update user's preferences
users.patch('/me/preferences', authMiddleware, zValidator('json', updateUserPreferencesSchema), async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const { hideLogo } = c.req.valid('json');

    const updateData: any = { updatedAt: new Date() };
    if (hideLogo !== undefined) updateData.hideLogo = hideLogo;

    const [updatedUser] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, user.userId))
      .returning();

    if (!updatedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Return user data with parsed roles
    return c.json({
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      roles: JSON.parse(updatedUser.roles),
      preferredThemeId: updatedUser.preferredThemeId,
      preferredStyleMode: updatedUser.preferredStyleMode,
      hideLogo: updatedUser.hideLogo
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

// Get all users (admin only)
users.get('/', authMiddleware, requirePermission('user:manage'), async (c) => {
  const allUsers = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    roles: usersTable.roles,
    createdAt: usersTable.createdAt,
    updatedAt: usersTable.updatedAt
  }).from(usersTable);

  return c.json(allUsers.map(user => ({
    ...user,
    roles: JSON.parse(user.roles)
  })));
});

// Create new user (admin only)
users.post('/', authMiddleware, requirePermission('user:manage'), zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');

  // Check if username already exists
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, data.username)).limit(1);
  if (existing.length > 0) {
    return c.json({ error: 'Username already taken' }, 400);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user
  const [newUser] = await db.insert(usersTable).values({
    username: data.username,
    passwordHash,
    displayName: data.displayName,
    roles: JSON.stringify(data.roles)
  }).returning();

  return c.json({
    id: newUser.id,
    username: newUser.username,
    displayName: newUser.displayName,
    roles: JSON.parse(newUser.roles),
    createdAt: newUser.createdAt
  }, 201);
});

// Update user (admin only)
users.patch('/:userId', authMiddleware, requirePermission('user:manage'), zValidator('json', updateUserSchema), async (c) => {
  const userId = c.req.param('userId');
  const data = c.req.valid('json');

  const updateData: any = {};

  if (data.username) updateData.username = data.username;
  if (data.displayName) updateData.displayName = data.displayName;
  if (data.roles) updateData.roles = JSON.stringify(data.roles);
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

  updateData.updatedAt = new Date();

  const [updatedUser] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updatedUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: updatedUser.id,
    username: updatedUser.username,
    displayName: updatedUser.displayName,
    roles: JSON.parse(updatedUser.roles),
    updatedAt: updatedUser.updatedAt
  });
});

// Delete user (admin only)
users.delete('/:userId', authMiddleware, requirePermission('user:manage'), async (c) => {
  const userId = c.req.param('userId');

  // Get the user being deleted
  const [userToDelete] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!userToDelete) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Check if this user has admin role
  const roles = JSON.parse(userToDelete.roles);
  if (roles.includes('admin')) {
    // Count total admin users
    const allUsers = await db.select().from(usersTable);
    const adminCount = allUsers.filter(u => {
      const userRoles = JSON.parse(u.roles);
      return userRoles.includes('admin');
    }).length;

    // Prevent deletion if this is the last admin
    if (adminCount <= 1) {
      return c.json({
        error: 'Cannot delete the last admin user. Create another admin first.'
      }, 400);
    }
  }

  const result = await db
    .delete(usersTable)
    .where(eq(usersTable.id, userId))
    .returning();

  return c.json({ message: 'User deleted successfully' });
});

export default users;
