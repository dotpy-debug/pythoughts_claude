/**
 * Security Headers Configuration
 *
 * Provides comprehensive security headers for protecting the application
 * against common web vulnerabilities.
 */

import { isProduction } from '../lib/env';

/**
 * Security headers to be applied to all responses
 */
export const securityHeaders = {
  // Content Security Policy
  // Prevents XSS attacks by controlling what resources can be loaded
  'Content-Security-Policy': isProduction()
    ? [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net", // Allow CDN scripts if needed
        "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for styled components
        "img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in https://images.pexels.com https://images.unsplash.com https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Dev mode needs eval for HMR
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in https://images.pexels.com https://images.unsplash.com https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:*",
        "frame-ancestors 'none'",
      ].join('; '),

  // Strict Transport Security
  // Enforces HTTPS connections
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

  // X-Frame-Options
  // Prevents clickjacking attacks
  'X-Frame-Options': 'DENY',

  // X-Content-Type-Options
  // Prevents MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Referrer-Policy
  // Controls referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions-Policy
  // Controls browser features and APIs
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()', // Disable FLoC
  ].join(', '),

  // X-XSS-Protection (legacy, but good for older browsers)
  'X-XSS-Protection': '1; mode=block',

  // X-DNS-Prefetch-Control
  'X-DNS-Prefetch-Control': 'off',
};

/**
 * CORS headers for API requests
 */
export function getCORSHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = isProduction()
    ? ['https://pythoughts.com'] // Replace with actual production domain
    : ['http://localhost:5173', 'http://localhost:3000'];

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Apply security headers to a Response object (for service workers/middleware)
 */
export function applySecurityHeaders(headers: Headers): Headers {
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
  return headers;
}

/**
 * Create meta tags for security headers (for index.html)
 */
export function getSecurityMetaTags(): string {
  return `
    <!-- Security Headers -->
    <meta http-equiv="Content-Security-Policy" content="${securityHeaders['Content-Security-Policy']}">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
    <meta http-equiv="Permissions-Policy" content="${securityHeaders['Permissions-Policy']}">
  `.trim();
}

/**
 * Validate CSP compliance for a given resource
 */
export function isCSPCompliant(resourceUrl: string, directive: string): boolean {
  try {
    const url = new URL(resourceUrl);

    // Check against CSP directives
    switch (directive) {
      case 'script-src': {
        return url.hostname === globalThis.location.hostname || url.hostname === 'cdn.jsdelivr.net';
      }
      case 'img-src': {
        return url.protocol === 'https:' || url.protocol === 'data:';
      }
      case 'connect-src': {
        return (
          url.hostname === globalThis.location.hostname ||
          url.hostname.endsWith('.supabase.co')
        );
      }
      default: {
        return false;
      }
    }
  } catch {
    return false;
  }
}

export default securityHeaders;
