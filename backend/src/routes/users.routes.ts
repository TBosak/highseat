import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { UserService } from '../services/user.service';
import { authMiddleware } from '../middleware/auth.middleware';
import type { AuthEnv, JWTPayload } from '../types';

const users = new Hono<AuthEnv>();

const updateThemePreferenceSchema = z.object({
  preferredThemeId: z.string(),
  preferredStyleMode: z.string().optional()
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
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      roles: JSON.parse(updatedUser.roles),
      preferredThemeId: updatedUser.preferredThemeId,
      preferredStyleMode: updatedUser.preferredStyleMode
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

export default users;
