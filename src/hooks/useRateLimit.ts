import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../lib/logger';

/**
 * Client-side rate limiting hook
 * Uses local storage to persist rate limits across page reloads
 */

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

export const CLIENT_RATE_LIMITS = {
  // Post operations
  POST_CREATE: { maxRequests: 10, windowMs: 60000 }, // 10 posts per minute
  POST_UPDATE: { maxRequests: 30, windowMs: 60000 }, // 30 updates per minute
  POST_DELETE: { maxRequests: 5, windowMs: 60000 }, // 5 deletes per minute

  // Comment operations
  COMMENT_CREATE: { maxRequests: 30, windowMs: 60000 }, // 30 comments per minute
  COMMENT_UPDATE: { maxRequests: 50, windowMs: 60000 }, // 50 updates per minute

  // Vote operations
  VOTE_CREATE: { maxRequests: 100, windowMs: 60000 }, // 100 votes per minute

  // Report operations
  REPORT_CREATE: { maxRequests: 5, windowMs: 60000 }, // 5 reports per minute

  // Search operations
  SEARCH: { maxRequests: 20, windowMs: 60000 }, // 20 searches per minute
} as const;

export type ClientRateLimitKey = keyof typeof CLIENT_RATE_LIMITS;

type RequestTimestamp = {
  timestamps: number[];
  lastCleanup: number;
};

const STORAGE_PREFIX = 'ratelimit_';

/**
 * Hook to enforce client-side rate limiting
 */
export function useRateLimit(limitKey: ClientRateLimitKey) {
  const config = CLIENT_RATE_LIMITS[limitKey];
  const storageKey = `${STORAGE_PREFIX}${limitKey}`;
  const [remaining, setRemaining] = useState(config.maxRequests);
  const [resetTime, setResetTime] = useState<number>(Date.now() + config.windowMs);
  const isInitialized = useRef(false);

  // Load initial state from localStorage
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data: RequestTimestamp = JSON.parse(stored);
        const now = Date.now();
        const validTimestamps = data.timestamps.filter(ts => now - ts < config.windowMs);

        setRemaining(Math.max(0, config.maxRequests - validTimestamps.length) as typeof remaining);

        if (validTimestamps.length > 0) {
          const oldestTimestamp = Math.min(...validTimestamps);
          setResetTime(oldestTimestamp + config.windowMs);
        }
      }
    } catch (error) {
      logger.error('Failed to load rate limit state', error as Error);
    }
  }, [limitKey, storageKey, config.maxRequests, config.windowMs]);

  /**
   * Check if request is allowed and consume a token
   */
  const checkLimit = useCallback((): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } => {
    const now = Date.now();

    try {
      // Load current state
      const stored = localStorage.getItem(storageKey);
      let data: RequestTimestamp = stored
        ? JSON.parse(stored)
        : { timestamps: [], lastCleanup: now };

      // Clean up old timestamps if needed
      if (now - data.lastCleanup > config.windowMs / 2) {
        data.timestamps = data.timestamps.filter(ts => now - ts < config.windowMs);
        data.lastCleanup = now;
      }

      const validTimestamps = data.timestamps.filter(ts => now - ts < config.windowMs);
      const currentRemaining = Math.max(0, config.maxRequests - validTimestamps.length);

      // Check if limit exceeded
      if (currentRemaining === 0) {
        const oldestTimestamp = Math.min(...validTimestamps);
        const currentResetTime = oldestTimestamp + config.windowMs;

        setRemaining(0 as typeof remaining);
        setResetTime(currentResetTime);

        logger.warn('Client-side rate limit exceeded', {
          limitKey,
          remaining: 0,
          resetIn: currentResetTime - now,
        });

        return {
          allowed: false,
          remaining: 0,
          resetTime: currentResetTime,
        };
      }

      // Consume a token
      validTimestamps.push(now);
      const newData: RequestTimestamp = {
        timestamps: validTimestamps,
        lastCleanup: data.lastCleanup,
      };

      localStorage.setItem(storageKey, JSON.stringify(newData));

      const newRemaining = Math.max(0, config.maxRequests - validTimestamps.length);
      const oldestTimestamp = Math.min(...validTimestamps);
      const currentResetTime = oldestTimestamp + config.windowMs;

      setRemaining(newRemaining as typeof remaining);
      setResetTime(currentResetTime);

      return {
        allowed: true,
        remaining: newRemaining,
        resetTime: currentResetTime,
      };

    } catch (error) {
      logger.error('Rate limit check failed', error as Error);

      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
  }, [limitKey, storageKey, config.maxRequests, config.windowMs]);

  /**
   * Reset the rate limit (useful for testing)
   */
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setRemaining(config.maxRequests);
      setResetTime(Date.now() + config.windowMs);
      logger.info('Rate limit reset', { limitKey });
    } catch (error) {
      logger.error('Failed to reset rate limit', error as Error);
    }
  }, [limitKey, storageKey, config.maxRequests, config.windowMs]);

  /**
   * Wrapper function to rate limit an async operation
   */
  const rateLimitedCall = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      const { allowed, remaining: currentRemaining, resetTime: currentResetTime } = checkLimit();

      if (!allowed) {
        const waitTime = Math.ceil((currentResetTime - Date.now()) / 1000);
        throw new Error(
          `Rate limit exceeded. You can try again in ${waitTime} seconds. (${currentRemaining}/${config.maxRequests} remaining)`
        );
      }

      return await fn();
    },
    [checkLimit, config.maxRequests]
  );

  return {
    checkLimit,
    rateLimitedCall,
    reset,
    remaining,
    resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Higher-order function to wrap a function with rate limiting
 */
export function withRateLimit<TArgs extends unknown[], TReturn>(
  limitKey: ClientRateLimitKey,
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  const config = CLIENT_RATE_LIMITS[limitKey];
  const storageKey = `${STORAGE_PREFIX}${limitKey}`;

  return async (...args: TArgs): Promise<TReturn> => {
    const now = Date.now();

    try {
      // Load current state
      const stored = localStorage.getItem(storageKey);
      let data: RequestTimestamp = stored
        ? JSON.parse(stored)
        : { timestamps: [], lastCleanup: now };

      // Clean up old timestamps
      const validTimestamps = data.timestamps.filter(ts => now - ts < config.windowMs);
      const remaining = Math.max(0, config.maxRequests - validTimestamps.length);

      // Check if limit exceeded
      if (remaining === 0) {
        const oldestTimestamp = Math.min(...validTimestamps);
        const resetTime = oldestTimestamp + config.windowMs;
        const waitTime = Math.ceil((resetTime - now) / 1000);

        throw new Error(
          `Rate limit exceeded. You can try again in ${waitTime} seconds.`
        );
      }

      // Consume a token
      validTimestamps.push(now);
      const newData: RequestTimestamp = {
        timestamps: validTimestamps,
        lastCleanup: now,
      };

      localStorage.setItem(storageKey, JSON.stringify(newData));

      // Execute the function
      return await fn(...args);

    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error;
      }

      // On storage error, allow the request (fail open)
      logger.error('Rate limit wrapper error', error as Error);
      return await fn(...args);
    }
  };
}
