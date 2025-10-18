import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  enforceRateLimit,
  RateLimitError,
  RATE_LIMITS,
  getClientIp
} from './rate-limit';
import { getRedisClient } from './redis';

describe('Rate Limiting', () => {
  const testIdentifier = 'test-user-123';

  beforeEach(async () => {
    // Clear all test rate limits before each test
    const redis = getRedisClient();
    const keys = await redis.keys('ratelimit:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterEach(async () => {
    // Clean up after each test
    const redis = getRedisClient();
    const keys = await redis.keys('ratelimit:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('checkRateLimit', () => {
    it('should allow requests within the limit', async () => {
      const result = await checkRateLimit('COMMENT_CREATE', testIdentifier);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(RATE_LIMITS.COMMENT_CREATE.points);
      expect(result.remaining).toBe(RATE_LIMITS.COMMENT_CREATE.points - 1);
      expect(result.reset).toBeGreaterThan(Date.now() / 1000);
    });

    it('should consume multiple points', async () => {
      const result = await checkRateLimit('COMMENT_CREATE', testIdentifier, 5);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.COMMENT_CREATE.points - 5);
    });

    it('should block requests when limit is exceeded', async () => {
      const limit = RATE_LIMITS.COMMENT_CREATE.points;

      // Consume all points
      for (let i = 0; i < limit; i++) {
        const result = await checkRateLimit('COMMENT_CREATE', testIdentifier);
        expect(result.success).toBe(true);
      }

      // Next request should be blocked
      const blockedResult = await checkRateLimit('COMMENT_CREATE', testIdentifier);

      expect(blockedResult.success).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });

    it('should track different identifiers separately', async () => {
      const identifier1 = 'user-1';
      const identifier2 = 'user-2';

      await checkRateLimit('COMMENT_CREATE', identifier1);
      const result = await checkRateLimit('COMMENT_CREATE', identifier2);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.COMMENT_CREATE.points - 1);
    });

    it('should track different limit keys separately', async () => {
      await checkRateLimit('COMMENT_CREATE', testIdentifier);
      const result = await checkRateLimit('POST_CREATE', testIdentifier);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.POST_CREATE.points - 1);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset the rate limit counter', async () => {
      // Consume some points
      await checkRateLimit('COMMENT_CREATE', testIdentifier, 5);

      // Reset
      await resetRateLimit('COMMENT_CREATE', testIdentifier);

      // Check that we have full capacity again
      const result = await checkRateLimit('COMMENT_CREATE', testIdentifier);
      expect(result.remaining).toBe(RATE_LIMITS.COMMENT_CREATE.points - 1);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current status without consuming points', async () => {
      // Consume some points
      await checkRateLimit('COMMENT_CREATE', testIdentifier, 5);

      // Check status multiple times
      const status1 = await getRateLimitStatus('COMMENT_CREATE', testIdentifier);
      const status2 = await getRateLimitStatus('COMMENT_CREATE', testIdentifier);

      expect(status1.remaining).toBe(RATE_LIMITS.COMMENT_CREATE.points - 5);
      expect(status2.remaining).toBe(RATE_LIMITS.COMMENT_CREATE.points - 5);
    });

    it('should show exceeded status when limit is reached', async () => {
      const limit = RATE_LIMITS.COMMENT_CREATE.points;

      // Consume all points
      for (let i = 0; i < limit; i++) {
        await checkRateLimit('COMMENT_CREATE', testIdentifier);
      }

      const status = await getRateLimitStatus('COMMENT_CREATE', testIdentifier);

      expect(status.success).toBe(false);
      expect(status.remaining).toBe(0);
      expect(status.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('enforceRateLimit', () => {
    it('should not throw when within limits', async () => {
      await expect(
        enforceRateLimit('COMMENT_CREATE', testIdentifier)
      ).resolves.not.toThrow();
    });

    it('should throw RateLimitError when limit exceeded', async () => {
      const limit = RATE_LIMITS.COMMENT_CREATE.points;

      // Consume all points
      for (let i = 0; i < limit; i++) {
        await enforceRateLimit('COMMENT_CREATE', testIdentifier);
      }

      // Next request should throw
      await expect(
        enforceRateLimit('COMMENT_CREATE', testIdentifier)
      ).rejects.toThrow(RateLimitError);
    });

    it('should include retry information in error', async () => {
      const limit = RATE_LIMITS.COMMENT_CREATE.points;

      // Consume all points
      for (let i = 0; i < limit; i++) {
        await enforceRateLimit('COMMENT_CREATE', testIdentifier);
      }

      try {
        await enforceRateLimit('COMMENT_CREATE', testIdentifier);
        expect.fail('Should have thrown RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        if (error instanceof RateLimitError) {
          expect(error.retryAfter).toBeGreaterThan(0);
          expect(error.limit).toBe(RATE_LIMITS.COMMENT_CREATE.points);
          expect(error.reset).toBeGreaterThan(Date.now() / 1000);
        }
      }
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');

      const ip = getClientIp(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '192.168.1.1');

      const ip = getClientIp(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
      const headers = new Headers();
      headers.set('cf-connecting-ip', '192.168.1.1');

      const ip = getClientIp(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should prefer x-forwarded-for over other headers', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1');
      headers.set('x-real-ip', '10.0.0.1');
      headers.set('cf-connecting-ip', '172.16.0.1');

      const ip = getClientIp(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return "unknown" when no IP headers present', () => {
      const headers = new Headers();

      const ip = getClientIp(headers);
      expect(ip).toBe('unknown');
    });
  });

  describe('Rate limit configurations', () => {
    it('should have appropriate limits for authentication operations', () => {
      expect(RATE_LIMITS.AUTH_LOGIN.points).toBeLessThanOrEqual(10);
      expect(RATE_LIMITS.AUTH_SIGNUP.points).toBeLessThanOrEqual(5);
      expect(RATE_LIMITS.AUTH_PASSWORD_RESET.points).toBeLessThanOrEqual(5);
    });

    it('should have appropriate limits for write operations', () => {
      expect(RATE_LIMITS.POST_CREATE.points).toBeLessThanOrEqual(20);
      expect(RATE_LIMITS.COMMENT_CREATE.points).toBeLessThanOrEqual(50);
      expect(RATE_LIMITS.REPORT_CREATE.points).toBeLessThanOrEqual(20);
    });

    it('should have higher limits for read operations', () => {
      expect(RATE_LIMITS.API_READ.points).toBeGreaterThan(RATE_LIMITS.API_WRITE.points);
    });
  });
});
