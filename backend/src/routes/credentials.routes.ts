import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { credentialsService } from '../services/credentials.service';
import { authMiddleware } from '../middleware/auth.middleware';
import type { AuthEnv } from '../types';

const credentials = new Hono<AuthEnv>();

const createCredentialSchema = z.object({
  name: z.string().min(1),
  serviceType: z.string().min(1),
  data: z.record(z.any()),
  metadata: z.record(z.any()).optional()
});

const updateCredentialSchema = z.object({
  name: z.string().min(1).optional(),
  data: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

const listCredentialsSchema = z.object({
  serviceType: z.string().optional()
});

/**
 * Create a new credential
 * POST /api/credentials
 */
credentials.post('/', authMiddleware, zValidator('json', createCredentialSchema), async (c) => {
  try {
    const userId = c.get('user').userId;
    const { name, serviceType, data, metadata } = c.req.valid('json');

    const credential = await credentialsService.createCredential({
      userId,
      name,
      serviceType,
      data,
      metadata
    });

    return c.json({ credential }, 201);
  } catch (error) {
    console.error('[Credentials API] Create error:', error);
    return c.json({ error: 'Failed to create credential' }, 500);
  }
});

/**
 * List credentials for authenticated user
 * GET /api/credentials?serviceType=plex
 */
credentials.get('/', authMiddleware, zValidator('query', listCredentialsSchema), async (c) => {
  try {
    const userId = c.get('user').userId;
    const { serviceType } = c.req.valid('query');

    const credentialsList = await credentialsService.listCredentials(userId, serviceType);

    return c.json({ credentials: credentialsList });
  } catch (error) {
    console.error('[Credentials API] List error:', error);
    return c.json({ error: 'Failed to list credentials' }, 500);
  }
});

/**
 * Get a specific credential (with decrypted data)
 * GET /api/credentials/:id
 */
credentials.get('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('user').userId;
    const credentialId = c.req.param('id');

    const credential = await credentialsService.getCredential(credentialId, userId);

    if (!credential) {
      return c.json({ error: 'Credential not found' }, 404);
    }

    return c.json({ credential });
  } catch (error) {
    console.error('[Credentials API] Get error:', error);
    return c.json({ error: 'Failed to get credential' }, 500);
  }
});

/**
 * Update a credential
 * PUT /api/credentials/:id
 */
credentials.put('/:id', authMiddleware, zValidator('json', updateCredentialSchema), async (c) => {
  try {
    const userId = c.get('user').userId;
    const credentialId = c.req.param('id');
    const updates = c.req.valid('json');

    const credential = await credentialsService.updateCredential(credentialId, userId, updates);

    if (!credential) {
      return c.json({ error: 'Credential not found' }, 404);
    }

    return c.json({ credential });
  } catch (error) {
    console.error('[Credentials API] Update error:', error);
    return c.json({ error: 'Failed to update credential' }, 500);
  }
});

/**
 * Delete a credential
 * DELETE /api/credentials/:id
 */
credentials.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('user').userId;
    const credentialId = c.req.param('id');

    const deleted = await credentialsService.deleteCredential(credentialId, userId);

    if (!deleted) {
      return c.json({ error: 'Credential not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('[Credentials API] Delete error:', error);
    return c.json({ error: 'Failed to delete credential' }, 500);
  }
});

/**
 * Test a credential (verify it can be decrypted)
 * POST /api/credentials/:id/test
 */
credentials.post('/:id/test', authMiddleware, async (c) => {
  try {
    const userId = c.get('user').userId;
    const credentialId = c.req.param('id');

    const isValid = await credentialsService.testCredential(credentialId, userId);

    return c.json({ valid: isValid });
  } catch (error) {
    console.error('[Credentials API] Test error:', error);
    return c.json({ error: 'Failed to test credential' }, 500);
  }
});

export default credentials;
