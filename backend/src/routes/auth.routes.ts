import { Hono, MiddlewareHandler } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { authMiddleware, getPermissionsFromRoles } from '../middleware/auth.middleware';
import type { AuthEnv, JWTPayload } from '../types';

const auth = new Hono<AuthEnv>();

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { username, password, displayName } = c.req.valid('json');
    const result = await AuthService.register(username, password, displayName);
    return c.json(result, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { username, password } = c.req.valid('json');
    const result = await AuthService.login(username, password);
    return c.json(result);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 401);
  }
});

auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid('json');
    const result = await AuthService.refresh(refreshToken);
    return c.json(result);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 401);
  }
});

auth.get('/me', authMiddleware, async (c) => {
  const jwtUser = c.get('user') as JWTPayload;
  const permissions = getPermissionsFromRoles(jwtUser.roles);

  // Fetch full user record to include theme preferences
  const user = await UserService.getUserById(jwtUser.userId);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: JSON.parse(user.roles),
      preferredThemeId: user.preferredThemeId,
      preferredStyleMode: user.preferredStyleMode,
      permissions
    }
  });
});

auth.post('/logout', authMiddleware, zValidator('json', refreshSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid('json');
    await AuthService.revokeRefreshToken(refreshToken);
    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

export default auth;
