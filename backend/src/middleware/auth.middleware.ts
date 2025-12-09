import type { Context, Next } from 'hono';
import { AuthService } from '../services/auth.service';
import type { JWTPayload, Permission } from '../types';

export interface AuthContext {
  user: JWTPayload;
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = AuthService.verifyAccessToken(token);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

export const requirePermission = (...requiredPermissions: Permission[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload;

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userPermissions = getPermissionsFromRoles(user.roles);
    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
};

// Map roles to permissions
function getPermissionsFromRoles(roles: string[]): Permission[] {
  const permissionMap: Record<string, Permission[]> = {
    admin: [
      'board:view',
      'board:edit',
      'board:design',
      'card:add',
      'card:edit',
      'card:delete',
      'theme:edit',
      'role:manage',
      'user:manage'
    ],
    designer: [
      'board:view',
      'board:edit',
      'board:design',
      'card:add',
      'card:edit',
      'card:delete',
      'theme:edit'
    ],
    editor: [
      'board:view',
      'board:edit',
      'card:add',
      'card:edit',
      'card:delete'
    ],
    viewer: ['board:view']
  };

  const permissions = new Set<Permission>();
  roles.forEach(role => {
    const rolePerms = permissionMap[role] || [];
    rolePerms.forEach(p => permissions.add(p));
  });

  return Array.from(permissions);
}

export { getPermissionsFromRoles };
