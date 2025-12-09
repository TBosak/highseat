import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index';
import { roles as rolesTable } from '../db/schema';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { eq } from 'drizzle-orm';
import { AuthEnv } from '../types';

const roles = new Hono<AuthEnv>();

roles.use('*', authMiddleware);

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1)
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1).optional()
});

// Get all roles
roles.get('/', requirePermission('role:manage'), async (c) => {
  const allRoles = await db.select({
    id: rolesTable.id,
    name: rolesTable.name,
    description: rolesTable.description,
    permissions: rolesTable.permissions,
    isSystem: rolesTable.isSystem,
    createdAt: rolesTable.createdAt,
    updatedAt: rolesTable.updatedAt
  }).from(rolesTable);

  return c.json(allRoles.map(role => ({
    ...role,
    permissions: JSON.parse(role.permissions)
  })));
});

// Get single role
roles.get('/:roleId', requirePermission('role:manage'), async (c) => {
  const roleId = c.req.param('roleId');

  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1);

  if (!role) {
    return c.json({ error: 'Role not found' }, 404);
  }

  return c.json({
    ...role,
    permissions: JSON.parse(role.permissions)
  });
});

// Create new role
roles.post('/', requirePermission('role:manage'), zValidator('json', createRoleSchema), async (c) => {
  const data = c.req.valid('json');

  // Check if role name already exists
  const existing = await db.select().from(rolesTable).where(eq(rolesTable.name, data.name)).limit(1);
  if (existing.length > 0) {
    return c.json({ error: 'Role with this name already exists' }, 400);
  }

  // Create role
  const [newRole] = await db.insert(rolesTable).values({
    name: data.name,
    description: data.description,
    permissions: JSON.stringify(data.permissions),
    isSystem: false
  }).returning();

  return c.json({
    id: newRole.id,
    name: newRole.name,
    description: newRole.description,
    permissions: JSON.parse(newRole.permissions),
    isSystem: newRole.isSystem,
    createdAt: newRole.createdAt
  }, 201);
});

// Update role
roles.patch('/:roleId', requirePermission('role:manage'), zValidator('json', updateRoleSchema), async (c) => {
  const roleId = c.req.param('roleId');
  const data = c.req.valid('json');

  // Check if role exists and is not a system role
  const [existingRole] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1);
  if (!existingRole) {
    return c.json({ error: 'Role not found' }, 404);
  }

  if (existingRole.isSystem) {
    return c.json({ error: 'Cannot modify system roles' }, 403);
  }

  const updateData: any = {};

  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.permissions) updateData.permissions = JSON.stringify(data.permissions);

  updateData.updatedAt = new Date();

  const [updatedRole] = await db
    .update(rolesTable)
    .set(updateData)
    .where(eq(rolesTable.id, roleId))
    .returning();

  return c.json({
    id: updatedRole.id,
    name: updatedRole.name,
    description: updatedRole.description,
    permissions: JSON.parse(updatedRole.permissions),
    isSystem: updatedRole.isSystem,
    updatedAt: updatedRole.updatedAt
  });
});

// Delete role
roles.delete('/:roleId', requirePermission('role:manage'), async (c) => {
  const roleId = c.req.param('roleId');

  // Check if role exists and is not a system role
  const [existingRole] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1);
  if (!existingRole) {
    return c.json({ error: 'Role not found' }, 404);
  }

  if (existingRole.isSystem) {
    return c.json({ error: 'Cannot delete system roles' }, 403);
  }

  await db
    .delete(rolesTable)
    .where(eq(rolesTable.id, roleId));

  return c.json({ message: 'Role deleted successfully' });
});

export default roles;
