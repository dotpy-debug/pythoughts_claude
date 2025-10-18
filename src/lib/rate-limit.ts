import { getRedisClient } from './redis';
import { logger } from './logger';
import { ExternalServiceError, ErrorLogger } from './errors';

/**
 * Rate limit configuration for different operations
 */
export const RATE_LIMITS = {
  // Authentication and account operations (per IP)
  AUTH_LOGIN: { points: 5, duration: 300 }, // 5 attempts per 5 minutes
  AUTH_SIGNUP: { points: 3, duration: 3600 }, // 3 signups per hour
  AUTH_PASSWORD_RESET: { points: 3, duration: 3600 }, // 3 resets per hour

  // Post operations (per user)
  POST_CREATE: { points: 10, duration: 3600 }, // 10 posts per hour
  POST_UPDATE: { points: 30, duration: 3600 }, // 30 updates per hour
  POST_DELETE: { points: 10, duration: 3600 }, // 10 deletes per hour

  // Comment operations (per user)
  COMMENT_CREATE: { points: 30, duration: 3600 }, // 30 comments per hour
  COMMENT_UPDATE: { points: 50, duration: 3600 }, // 50 updates per hour

  // Vote operations (per user)
  VOTE_CREATE: { points: 100, duration: 3600 }, // 100 votes per hour

  // Report operations (per user)
  REPORT_CREATE: { points: 10, duration: 3600 }, // 10 reports per hour

  // API read operations (per IP)
  API_READ: { points: 300, duration: 60 }, // 300 reads per minute

  // API write operations (per user)
  API_WRITE: { points: 100, duration: 60 }, // 100 writes per minute

  // Search operations (per IP)
  SEARCH: { points: 20, duration: 60 }, // 20 searches per minute
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

/**
 * Rate limit result
 */
export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  retryAfter?: number; // Seconds until the user can retry
};

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public limit: number,
    public reset: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Gets a rate limit key for Redis
 */
function getRateLimitKey(limitKey: RateLimitKey, identifier: string): string {
  return `ratelimit:${limitKey}:${identifier}`;
}

/**
 * Checks and consumes a rate limit using the Token Bucket algorithm
 *
 * @param limitKey - The type of rate limit to check
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @param points - Number of points to consume (default: 1)
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
  limitKey: RateLimitKey,
  identifier: string,
  points: number = 1
): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient();
    const limit = RATE_LIMITS[limitKey];
    const key = getRateLimitKey(limitKey, identifier);

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    const now = Math.floor(Date.now() / 1000);

    // Get current count
    pipeline.get(key);
    pipeline.ttl(key);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const [[getCurrentError, currentCount], [getTtlError, ttl]] = results as [
      [Error | null, string | null],
      [Error | null, number]
    ];

    if (getCurrentError || getTtlError) {
      throw getCurrentError || getTtlError;
    }

    const count = currentCount ? parseInt(currentCount, 10) : 0;
    const reset = ttl > 0 ? now + ttl : now + limit.duration;

    // Check if limit is exceeded
    if (count + points > limit.points) {
      const retryAfter = ttl > 0 ? ttl : limit.duration;

      logger.warn('Rate limit exceeded', {
        limitKey,
        identifier,
        count,
        limit: limit.points,
        retryAfter,
      });

      return {
        success: false,
        limit: limit.points,
        remaining: 0,
        reset,
        retryAfter,
      };
    }

    // Consume points
    const newCount = count + points;

    if (ttl === -2 || ttl === -1) {
      // Key doesn't exist or has no expiry, set it with expiry
      await redis.setex(key, limit.duration, newCount.toString());
    } else {
      // Key exists, increment it
      await redis.incrby(key, points);
    }

    logger.debug('Rate limit check passed', {
      limitKey,
      identifier,
      count: newCount,
      limit: limit.points,
      remaining: limit.points - newCount,
    });

    return {
      success: true,
      limit: limit.points,
      remaining: Math.max(0, limit.points - newCount),
      reset,
    };

  } catch (error) {
    const err = new ExternalServiceError(
      'Redis',
      'Rate limit check failed',
      error instanceof Error ? error : undefined
    );
    ErrorLogger.logExternalService(err, 'rate-limit-check', {
      limitKey,
      identifier,
    });

    // On error, allow the request to proceed (fail open)
    logger.warn('Rate limit check failed, allowing request', {
      limitKey,
      identifier,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return {
      success: true,
      limit: RATE_LIMITS[limitKey].points,
      remaining: RATE_LIMITS[limitKey].points,
      reset: Math.floor(Date.now() / 1000) + RATE_LIMITS[limitKey].duration,
    };
  }
}

/**
 * Resets a rate limit for a specific identifier
 * Useful for testing or admin operations
 */
export async function resetRateLimit(
  limitKey: RateLimitKey,
  identifier: string
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = getRateLimitKey(limitKey, identifier);
    await redis.del(key);

    logger.info('Rate limit reset', { limitKey, identifier });
  } catch (error) {
    const err = new ExternalServiceError(
      'Redis',
      'Rate limit reset failed',
      error instanceof Error ? error : undefined
    );
    ErrorLogger.logExternalService(err, 'rate-limit-reset', {
      limitKey,
      identifier,
    });
  }
}

/**
 * Gets the current rate limit status without consuming points
 */
export async function getRateLimitStatus(
  limitKey: RateLimitKey,
  identifier: string
): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient();
    const limit = RATE_LIMITS[limitKey];
    const key = getRateLimitKey(limitKey, identifier);
    const now = Math.floor(Date.now() / 1000);

    const pipeline = redis.pipeline();
    pipeline.get(key);
    pipeline.ttl(key);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const [[getCurrentError, currentCount], [getTtlError, ttl]] = results as [
      [Error | null, string | null],
      [Error | null, number]
    ];

    if (getCurrentError || getTtlError) {
      throw getCurrentError || getTtlError;
    }

    const count = currentCount ? parseInt(currentCount, 10) : 0;
    const remaining = Math.max(0, limit.points - count);
    const reset = ttl > 0 ? now + ttl : now + limit.duration;
    const isExceeded = count >= limit.points;

    return {
      success: !isExceeded,
      limit: limit.points,
      remaining,
      reset,
      retryAfter: isExceeded && ttl > 0 ? ttl : undefined,
    };

  } catch (error) {
    const err = new ExternalServiceError(
      'Redis',
      'Rate limit status check failed',
      error instanceof Error ? error : undefined
    );
    ErrorLogger.logExternalService(err, 'rate-limit-status', {
      limitKey,
      identifier,
    });

    return {
      success: true,
      limit: RATE_LIMITS[limitKey].points,
      remaining: RATE_LIMITS[limitKey].points,
      reset: Math.floor(Date.now() / 1000) + RATE_LIMITS[limitKey].duration,
    };
  }
}

/**
 * Middleware-like function to check rate limit and throw error if exceeded
 * Use this in Server Actions and API routes
 */
export async function enforceRateLimit(
  limitKey: RateLimitKey,
  identifier: string,
  points: number = 1
): Promise<void> {
  const result = await checkRateLimit(limitKey, identifier, points);

  if (!result.success) {
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      result.retryAfter || RATE_LIMITS[limitKey].duration,
      result.limit,
      result.reset
    );
  }
}

/**
 * Helper to get client IP from request headers
 * Checks multiple headers in order of preference
 */
export function getClientIp(headers: Headers): string {
  // Check headers in order of reliability
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}
