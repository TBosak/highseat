import type { MiddlewareHandler } from 'hono';

/**
 * Security headers middleware
 * Adds essential security headers to all responses
 */
export const securityHeaders = (): MiddlewareHandler => {
  return async (c, next) => {
    await next();

    // Prevent clickjacking attacks
    c.header('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection in older browsers
    c.header('X-XSS-Protection', '1; mode=block');

    // Referrer policy - don't leak referrer to external sites
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy - restrict powerful features
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Content Security Policy
    // Note: Adjust this based on your needs. This is a strict default.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Angular needs unsafe-inline and unsafe-eval
      "style-src 'self' 'unsafe-inline'", // Angular needs unsafe-inline for styles
      "img-src 'self' data: https: http:", // Allow images from self, data URIs, HTTPS, and HTTP (for local homelab services)
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    c.header('Content-Security-Policy', csp);

    // HSTS - force HTTPS (only enable in production with HTTPS)
    if (process.env.NODE_ENV === 'production') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
  };
};
