import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeInput,
  sanitizeURL,
  isValidEmail,
  isValidUsername,
  isValidPassword,
  isStrongPassword,
  isValidContentLength,
  checkRateLimit,
  isValidUUID,
  sanitizeSearchQuery,
  generateSecureToken,
  isValidSessionToken,
  maskEmail,
  removeSensitiveData,
  cleanupRateLimitStore,
} from './security';

describe('Security Utilities', () => {
  describe('sanitizeInput', () => {
    it('escapes HTML special characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('handles empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('escapes all dangerous characters', () => {
      const dangerous = '<>"\'&/';
      const sanitized = sanitizeInput(dangerous);

      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain('/');
    });
  });

  describe('sanitizeURL', () => {
    it('blocks javascript: protocol', () => {
      expect(sanitizeURL('javascript:alert("xss")')).toBe('');
    });

    it('blocks data: protocol', () => {
      expect(sanitizeURL('data:text/html,<script>alert("xss")</script>')).toBe('');
    });

    it('allows HTTPS URLs', () => {
      const url = 'https://example.com';
      expect(sanitizeURL(url)).toBe(url);
    });

    it('allows HTTP URLs', () => {
      const url = 'http://example.com';
      expect(sanitizeURL(url)).toBe(url);
    });

    it('allows relative URLs', () => {
      const url = '/path/to/resource';
      expect(sanitizeURL(url)).toBe(url);
    });

    it('adds https:// to URLs without protocol', () => {
      expect(sanitizeURL('example.com')).toBe('https://example.com');
    });

    it('handles empty string', () => {
      expect(sanitizeURL('')).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('validates correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('validates correct usernames', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('test_user')).toBe(true);
      expect(isValidUsername('user-name')).toBe(true);
      expect(isValidUsername('abc')).toBe(true); // Minimum 3 chars
      expect(isValidUsername('a'.repeat(20))).toBe(true); // Maximum 20 chars
    });

    it('rejects invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false); // Too short
      expect(isValidUsername('a'.repeat(21))).toBe(false); // Too long
      expect(isValidUsername('user name')).toBe(false); // Contains space
      expect(isValidUsername('user@name')).toBe(false); // Contains @
      expect(isValidUsername('user.name')).toBe(false); // Contains period
    });
  });

  describe('isValidPassword', () => {
    it('validates password with default minimum length', () => {
      expect(isValidPassword('123456')).toBe(true);
      expect(isValidPassword('password')).toBe(true);
    });

    it('rejects password shorter than minimum', () => {
      expect(isValidPassword('12345')).toBe(false);
      expect(isValidPassword('')).toBe(false);
    });

    it('validates password with custom minimum length', () => {
      expect(isValidPassword('12345678', 8)).toBe(true);
      expect(isValidPassword('1234567', 8)).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('validates strong passwords', () => {
      expect(isStrongPassword('Password123!')).toBe(true);
      expect(isStrongPassword('MyP@ssw0rd')).toBe(true);
      expect(isStrongPassword('Str0ng#Pass')).toBe(true);
    });

    it('rejects weak passwords', () => {
      expect(isStrongPassword('password')).toBe(false); // No uppercase, no number, no special
      expect(isStrongPassword('PASSWORD')).toBe(false); // No lowercase, no number, no special
      expect(isStrongPassword('Password')).toBe(false); // No number, no special
      expect(isStrongPassword('Password123')).toBe(false); // No special char
      expect(isStrongPassword('Pass1!')).toBe(false); // Too short
    });
  });

  describe('isValidContentLength', () => {
    it('validates content within length bounds', () => {
      expect(isValidContentLength('Hello', 1, 100)).toBe(true);
      expect(isValidContentLength('Test content', 5, 50)).toBe(true);
    });

    it('rejects content that is too short', () => {
      expect(isValidContentLength('', 1, 100)).toBe(false);
      expect(isValidContentLength('Hi', 5, 100)).toBe(false);
    });

    it('rejects content that is too long', () => {
      const longContent = 'a'.repeat(101);
      expect(isValidContentLength(longContent, 1, 100)).toBe(false);
    });

    it('uses default length bounds', () => {
      expect(isValidContentLength('Test')).toBe(true);
      expect(isValidContentLength('')).toBe(false);
      expect(isValidContentLength('a'.repeat(10001))).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit store before each test
      cleanupRateLimitStore();
    });

    it('allows requests within limit', () => {
      const result1 = checkRateLimit('test-user', 5, 60000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit('test-user', 5, 60000);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('blocks requests over limit', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-user', 5, 60000);
      }

      const result = checkRateLimit('test-user', 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('tracks different identifiers separately', () => {
      checkRateLimit('user1', 2, 60000);
      checkRateLimit('user1', 2, 60000);

      const user1Result = checkRateLimit('user1', 2, 60000);
      expect(user1Result.allowed).toBe(false);

      const user2Result = checkRateLimit('user2', 2, 60000);
      expect(user2Result.allowed).toBe(true);
    });

    it('provides reset time', () => {
      const result = checkRateLimit('test-user', 5, 60000);
      expect(result.resetTime).toBeGreaterThan(Date.now());
      expect(result.resetTime).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  describe('isValidUUID', () => {
    it('validates correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false); // Wrong version
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('removes special characters', () => {
      expect(sanitizeSearchQuery('search<script>alert()</script>')).toBe(
        'searchscriptalertscript'
      );
    });

    it('preserves word characters and hyphens', () => {
      expect(sanitizeSearchQuery('my-search query')).toBe('my-search query');
    });

    it('limits length to 100 characters', () => {
      const longQuery = 'a'.repeat(150);
      const result = sanitizeSearchQuery(longQuery);
      expect(result.length).toBe(100);
    });

    it('handles empty string', () => {
      expect(sanitizeSearchQuery('')).toBe('');
    });
  });

  describe('generateSecureToken', () => {
    it('generates token of default length', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('generates token of custom length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('generates unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('generates tokens with only hex characters', () => {
      const token = generateSecureToken();
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('isValidSessionToken', () => {
    it('validates correct session tokens', () => {
      const validToken = 'a'.repeat(64);
      expect(isValidSessionToken(validToken)).toBe(true);
    });

    it('rejects invalid session tokens', () => {
      expect(isValidSessionToken('short')).toBe(false);
      expect(isValidSessionToken('a'.repeat(63))).toBe(false);
      expect(isValidSessionToken('a'.repeat(65))).toBe(false);
      expect(isValidSessionToken('Z'.repeat(64))).toBe(false); // Uppercase not allowed
      expect(isValidSessionToken('')).toBe(false);
    });
  });

  describe('maskEmail', () => {
    it('masks email addresses correctly', () => {
      expect(maskEmail('user@example.com')).toBe('u***r@example.com');
      expect(maskEmail('alice@test.org')).toBe('a***e@test.org');
    });

    it('handles short email local parts', () => {
      expect(maskEmail('ab@example.com')).toBe('a***b@example.com');
      expect(maskEmail('a@example.com')).toBe('a***a@example.com');
    });

    it('handles invalid email format', () => {
      expect(maskEmail('invalid')).toBe('invalid');
      expect(maskEmail('no-at-sign.com')).toBe('no-at-sign.com');
    });
  });

  describe('removeSensitiveData', () => {
    it('removes password from object', () => {
      const data = { username: 'user', password: 'secret123' };
      const cleaned = removeSensitiveData(data);

      expect(cleaned.username).toBe('user');
      expect(cleaned.password).toBe('[REDACTED]');
    });

    it('removes token fields', () => {
      const data = { userId: '123', accessToken: 'abc123', refreshToken: 'xyz789' };
      const cleaned = removeSensitiveData(data);

      expect(cleaned.userId).toBe('123');
      expect(cleaned.accessToken).toBe('[REDACTED]');
      expect(cleaned.refreshToken).toBe('[REDACTED]');
    });

    it('removes API key fields', () => {
      const data = { appId: '123', apiKey: 'secret-key', secret: 'top-secret' };
      const cleaned = removeSensitiveData(data);

      expect(cleaned.appId).toBe('123');
      expect(cleaned.apiKey).toBe('[REDACTED]');
      expect(cleaned.secret).toBe('[REDACTED]');
    });

    it('does not mutate original object', () => {
      const data = { username: 'user', password: 'secret' };
      const cleaned = removeSensitiveData(data);

      expect(data.password).toBe('secret'); // Original unchanged
      expect(cleaned.password).toBe('[REDACTED]');
    });
  });
});
