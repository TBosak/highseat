import { rateLimiter } from 'hono-rate-limiter';

/**
 * Rate limiting for authentication endpoints
 * Prevents brute force and credential stuffing attacks
 *
 * Allows 5 requests per 15 minutes per IP address
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 requests per window
  standardHeaders: 'draft-7', // Return rate limit info in headers
  keyGenerator: (c) => {
    // Use IP address as the key
    return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  },
  handler: (c) => {
    return c.json(
      {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: c.res.headers.get('Retry-After')
      },
      429
    );
  }
});

/**
 * More lenient rate limiting for general API endpoints
 * Allows 100 requests per 15 minutes per IP address
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  standardHeaders: 'draft-7',
  keyGenerator: (c) => {
    return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  },
  handler: (c) => {
    return c.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: c.res.headers.get('Retry-After')
      },
      429
    );
  }
});
