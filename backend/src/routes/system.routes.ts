import { Hono } from 'hono';
import { systemInfoService } from '../services/system-info.service';

const systemRoutes = new Hono();

/**
 * GET /api/system/metrics
 * Get current system metrics (CPU, RAM, Disk)
 */
systemRoutes.get('/metrics', async (c) => {
  try {
    const metrics = await systemInfoService.getSystemMetrics();
    return c.json(metrics);
  } catch (error) {
    console.error('[System API] Error fetching metrics:', error);
    return c.json({ error: 'Failed to fetch system metrics' }, 500);
  }
});

/**
 * GET /api/system/processes
 * Get top processes
 * Query params:
 *   - sortBy: 'cpu' | 'mem' (default: 'cpu')
 *   - limit: number (default: 10)
 */
systemRoutes.get('/processes', async (c) => {
  try {
    const sortBy = (c.req.query('sortBy') as 'cpu' | 'mem') || 'cpu';
    const limit = parseInt(c.req.query('limit') || '10', 10);

    const processes = await systemInfoService.getProcessInfo(sortBy, limit);
    return c.json(processes);
  } catch (error) {
    console.error('[System API] Error fetching processes:', error);
    return c.json({ error: 'Failed to fetch process information' }, 500);
  }
});

/**
 * GET /api/system/network
 * Get network statistics
 */
systemRoutes.get('/network', async (c) => {
  try {
    const networkStats = await systemInfoService.getNetworkStats();
    return c.json(networkStats);
  } catch (error) {
    console.error('[System API] Error fetching network stats:', error);
    return c.json({ error: 'Failed to fetch network statistics' }, 500);
  }
});

/**
 * GET /api/system/info
 * Get general system information
 */
systemRoutes.get('/info', async (c) => {
  try {
    const systemInfo = await systemInfoService.getSystemInfo();
    const isDocker = systemInfoService.isDocker();

    return c.json({
      ...systemInfo,
      isDocker
    });
  } catch (error) {
    console.error('[System API] Error fetching system info:', error);
    return c.json({ error: 'Failed to fetch system information' }, 500);
  }
});

export default systemRoutes;
