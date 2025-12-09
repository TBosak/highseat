import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../middleware/auth.middleware';
import { AuthEnv } from '../types';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';

const uploadsRouter = new Hono<AuthEnv>();

uploadsRouter.use('*', authMiddleware);

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'backgrounds');

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Upload background image
uploadsRouter.post('/background', requirePermission('board:edit'), async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' }, 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
    }

    // Generate unique filename
    const ext = path.extname(file.name);
    const filename = `${createId()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Convert file to buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    // Return the URL path
    const url = `/uploads/backgrounds/${filename}`;

    return c.json({ url }, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

export default uploadsRouter;
