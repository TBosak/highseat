import { Hono } from 'hono';
import { discoverServices } from '../utils/service-discovery';

const app = new Hono();

/**
 * GET /api/services/discover
 * Discover running services (Docker containers, ports, etc.)
 */
app.get('/discover', async (c) => {
  try {
    const services = await discoverServices();
    return c.json(services);
  } catch (error) {
    console.error('Service discovery failed:', error);
    return c.json({ error: 'Failed to discover services' }, 500);
  }
});

export default app;
