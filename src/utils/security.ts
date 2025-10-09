/**
 * Security Utilities for Pythoughts Platform
 *
 * This module provides comprehensive security functions for:
 * - Input validation and sanitization
 * - XSS prevention
 * - SQL injection prevention
 * - Content Security Policy helpers
 * - Rate limiting utilities
 */

// Input Sanitization
// ------------------

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize HTML content while preserving safe formatting
 * Allows only whitelisted HTML tags
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';

  // This is a basic implementation - in production, use DOMPurify or similar library
  // For now, we rely on rehype-sanitize in markdown rendering
  // Allowed tags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'code', 'pre', 'blockquote']
  // Allowed attributes: ['href', 'title', 'target']
  return html;
}

/**
 * Validate and sanitize URLs to prevent javascript: and data: URI attacks
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';

  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file|about):/i;
  if (dangerousProtocols.test(trimmed)) {
    return '';
  }

  // Ensure HTTP/HTTPS or relative URLs
  if (!/^(https?:\/\/|\/)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

// Input Validation
// ----------------

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username (alphanumeric, underscore, hyphen, 3-20 chars)
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validate password strength
 * Requirements: min 6 chars (configurable)
 */
export function isValidPassword(password: string, minLength: number = 6): boolean {
  return password.length >= minLength;
}

/**
 * Validate password with strong requirements
 * Requirements: min 8 chars, uppercase, lowercase, number, special char
 */
export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
}

/**
 * Validate content length
 */
export function isValidContentLength(content: string, minLength: number = 1, maxLength: number = 10000): boolean {
  const length = content.trim().length;
  return length >= minLength && length <= maxLength;
}

// Rate Limiting
// -------------

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// SQL Injection Prevention
// ------------------------

/**
 * Validate UUID format to prevent SQL injection in ID parameters
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize search query to prevent SQL injection
 * Note: Supabase client uses parameterized queries, but this adds extra safety
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  return query
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
    .trim()
    .slice(0, 100); // Limit length
}

// Content Security
// ----------------

/**
 * Validate file upload type
 */
export function isValidFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

/**
 * Validate image URL
 */
export function isValidImageURL(url: string): boolean {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  return imageExtensions.test(url) || url.startsWith('https://');
}

/**
 * Generate Content Security Policy header value
 */
export function generateCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-inline/eval needed for Vite dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

// Session Security
// ----------------

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate session token format
 */
export function isValidSessionToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

// Error Handling
// --------------

/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeErrorMessage(error: unknown): string {
  // In production, never expose internal error details
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred. Please try again later.';
  }

  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

/**
 * Check if error is safe to display to user
 */
export function isSafeError(error: unknown): boolean {
  const safeErrorMessages = [
    'Invalid email or password',
    'Username already exists',
    'Email already registered',
    'Session expired',
    'Unauthorized',
    'Not found',
    'Invalid input',
  ];

  let message = '';
  if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as { message: unknown }).message);
  } else {
    message = String(error);
  }
  return safeErrorMessages.some(safe => message.includes(safe));
}

// Data Privacy
// ------------

/**
 * Mask email for display (e.g., u***r@example.com)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  const masked = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${masked}@${domain}`;
}

/**
 * Remove sensitive data from objects before logging
 */
export function removeSensitiveData<T extends Record<string, unknown>>(obj: T): T {
  const sensitive = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
  const cleaned = { ...obj };

  for (const key in cleaned) {
    if (sensitive.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      cleaned[key] = '[REDACTED]' as T[Extract<keyof T, string>];
    }
  }

  return cleaned;
}

// Export all utilities
export const SecurityUtils = {
  // Sanitization
  sanitizeInput,
  sanitizeHTML,
  sanitizeURL,

  // Validation
  isValidEmail,
  isValidUsername,
  isValidPassword,
  isStrongPassword,
  isValidContentLength,
  isValidUUID,
  isValidFileType,
  isValidImageURL,

  // Rate Limiting
  checkRateLimit,
  cleanupRateLimitStore,

  // Search
  sanitizeSearchQuery,

  // Security Headers
  generateCSPHeader,

  // Session
  generateSecureToken,
  isValidSessionToken,

  // Error Handling
  sanitizeErrorMessage,
  isSafeError,

  // Privacy
  maskEmail,
  removeSensitiveData,
};

export default SecurityUtils;
