import { getRedisClient, CACHE_TTL } from './redis';
import { logger } from './logger';
import { ExternalServiceError } from './errors';

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  message?: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
};

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  AUTH_LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  AUTH_SIGNUP: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 signups per hour
  AUTH_PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 resets per hour

  // Content creation - moderate limits
  CREATE_POST: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 posts per hour
  CREATE_COMMENT: { maxRequests: 30, windowMs: 60 * 60 * 1000 }, // 30 comments per hour
  CREATE_TASK: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 tasks per hour

  // Voting and reactions - higher limits
  VOTE: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 votes per hour
  REACTION: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 reactions per hour
  CLAP: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200 claps per hour

  // Search and read operations - very high limits
  SEARCH: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 searches per minute
  API_READ: { maxRequests: 300, windowMs: 60 * 1000 }, // 300 reads per minute

  // Admin operations - very strict
  ADMIN_ACTION: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 admin actions per minute
  MODERATION: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 moderation actions per minute

  // Report submission
  REPORT_CONTENT: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 reports per hour

  // Email operations
  SEND_EMAIL: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 emails per hour

  // Default fallback
  DEFAULT: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
} as const;

/**
 * Token bucket rate limiter using Redis
 * Implements a sliding window counter algorithm
 */
export class RateLimiter {
  private redis = getRedisClient();

  /**
   * Check if a request should be rate limited
   * @param key - Unique identifier for the rate limit (e.g., user ID, IP address)
   * @param config - Rate limit configuration
   * @returns Rate limit result with allowed status and metadata
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig = RATE_LIMITS.DEFAULT
  ): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const redisKey = `ratelimit:${key}`;

      // Use Redis sorted set for sliding window
      const multi = this.redis.multi();

      // Remove old entries outside the window
      multi.zremrangebyscore(redisKey, 0, windowStart);

      // Count requests in current window
      multi.zcard(redisKey);

      // Add current request
      multi.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Set expiry on the key
      multi.expire(redisKey, Math.ceil(config.windowMs / 1000));

      const results = await multi.exec();

      if (!results) {
        throw new Error('Redis multi exec failed');
      }

      // Get count from zcard result (index 1)
      const count = (results[1][1] as number) || 0;
      const allowed = count < config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count - 1);

      // Calculate reset time
      const resetAt = new Date(now + config.windowMs);

      // Calculate retry after if rate limited
      let retryAfter: number | undefined;
      if (!allowed) {
        // Get the oldest request timestamp
        const oldestRequests = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
        if (oldestRequests && oldestRequests.length >= 2) {
          const oldestTimestamp = parseInt(oldestRequests[1]);
          retryAfter = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);
        }
      }

      logger.debug('Rate limit check', {
        key,
        allowed,
        count,
        remaining,
        maxRequests: config.maxRequests,
      });

      return {
        allowed,
        remaining,
        resetAt,
        retryAfter,
      };
    } catch (error) {
      logger.error('Rate limiter error', error as Error, { key });

      // Fail open - allow the request if Redis is unavailable
      // This prevents service outage if Redis goes down
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   * Useful for administrative purposes or testing
   */
  async resetLimit(key: string): Promise<void> {
    try {
      const redisKey = `ratelimit:${key}`;
      await this.redis.del(redisKey);
      logger.info('Rate limit reset', { key });
    } catch (error) {
      logger.error('Failed to reset rate limit', error as Error, { key });
      throw new ExternalServiceError('Redis', 'Failed to reset rate limit', error as Error);
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const redisKey = `ratelimit:${key}`;

      // Clean up old entries and count current requests
      await this.redis.zremrangebyscore(redisKey, 0, windowStart);
      const count = await this.redis.zcard(redisKey);

      const allowed = count < config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetAt = new Date(now + config.windowMs);

      return {
        allowed,
        remaining,
        resetAt,
      };
    } catch (error) {
      logger.error('Failed to get rate limit status', error as Error, { key });
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }
  }

  /**
   * Create a composite key for rate limiting
   * Useful for combining user ID and IP address
   */
  static createKey(parts: string[]): string {
    return parts.filter(Boolean).join(':');
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limit middleware for server actions
 * Usage: await rateLimitCheck(userId, RATE_LIMITS.CREATE_POST);
 */
export async function rateLimitCheck(
  identifier: string,
  config: RateLimitConfig,
  errorMessage?: string
): Promise<void> {
  const result = await rateLimiter.checkLimit(identifier, config);

  if (!result.allowed) {
    const message = errorMessage || config.message || 'Too many requests. Please try again later.';
    const error = new Error(message) as Error & { retryAfter?: number; resetAt?: Date };
    error.retryAfter = result.retryAfter;
    error.resetAt = result.resetAt;

    logger.warn('Rate limit exceeded', {
      identifier,
      retryAfter: result.retryAfter,
      resetAt: result.resetAt,
    });

    throw error;
  }
}
