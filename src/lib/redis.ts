import Redis from 'ioredis';
import { env } from './env';
import { ExternalServiceError, ErrorLogger, withRetry, isRetryableError } from './errors';
import { logger } from './logger';

let redisClient: Redis | null = null;

/**
 * Gets or creates a Redis client instance with proper error handling
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    try {
      logger.info('Initializing Redis client', {
        url: env.VITE_REDIS_URL,
      });

      redisClient = new Redis(env.VITE_REDIS_URL, {
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);

          logger.debug('Redis retry attempt', {
            attempt: times,
            delay,
          });

          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      redisClient.on('error', (err) => {
        const error = new ExternalServiceError('Redis', err.message, err);
        ErrorLogger.logExternalService(error, 'redis-error');
      });

      redisClient.on('connect', () => {
        logger.info('Redis client connected successfully');
      });

      redisClient.on('ready', () => {
        logger.info('Redis client ready');
      });

      redisClient.on('close', () => {
        logger.warn('Redis connection closed');
      });

      redisClient.on('reconnecting', (delay: number) => {
        logger.info('Redis reconnecting', { delay });
      });

    } catch (error) {
      const err = new ExternalServiceError(
        'Redis',
        'Failed to initialize Redis client',
        error instanceof Error ? error : undefined
      );
      ErrorLogger.logExternalService(err, 'redis-init');
      throw err;
    }
  }

  return redisClient;
}

/**
 * Gracefully disconnects the Redis client
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis client', error as Error);
    }
  }
}

export const CACHE_KEYS = {
  POSTS: (type: string) => `posts:${type}`,
  POST: (id: string) => `post:${id}`,
  USER_PROFILE: (id: string) => `profile:${id}`,
  USER_VOTES: (userId: string) => `votes:${userId}`,
  TASKS: (userId: string) => `tasks:${userId}`,
  TASK: (id: string) => `task:${id}`,
  COMMENTS: (postId: string) => `comments:${postId}`,
  TASK_COMMENTS: (taskId: string) => `task_comments:${taskId}`,
  // Trending cache keys
  TRENDING_POSTS: (limit: number) => `trending:posts:limit:${limit}`,
  TRENDING_CATEGORY: (category: string, limit: number) => `trending:posts:category:${category}:limit:${limit}`,
  TRENDING_STATS: () => `trending:stats`,
  TRENDING_SCORE: (postId: string) => `trending:score:${postId}`,
};

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 1800,
  VERY_LONG: 3600,
};

/**
 * Gets a cached value with proper error handling
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const cached = await withRetry(
      () => redis.get(key),
      {
        maxRetries: 2,
        initialDelay: 100,
        shouldRetry: (error) => isRetryableError(error),
        onRetry: (_error, attempt, delay) => {
          logger.debug('Retrying cache get', { key, attempt, delay });
        },
      }
    );

    if (!cached) return null;

    return JSON.parse(cached) as T;
  } catch (error) {
    const err = new ExternalServiceError('Redis', 'Cache get failed', error as Error);
    ErrorLogger.logExternalService(err, 'cache-get', { key });
    return null;
  }
}

/**
 * Sets a cached value with TTL and proper error handling
 */
export async function cacheSet(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
  try {
    const redis = getRedisClient();
    await withRetry(
      () => redis.setex(key, ttl, JSON.stringify(value)),
      {
        maxRetries: 2,
        initialDelay: 100,
        shouldRetry: (error) => isRetryableError(error),
        onRetry: (_error, attempt, delay) => {
          logger.debug('Retrying cache set', { key, attempt, delay });
        },
      }
    );
  } catch (error) {
    const err = new ExternalServiceError('Redis', 'Cache set failed', error as Error);
    ErrorLogger.logExternalService(err, 'cache-set', { key, ttl });
  }
}

/**
 * Deletes a cached value with proper error handling
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await withRetry(
      () => redis.del(key),
      {
        maxRetries: 2,
        initialDelay: 100,
        shouldRetry: (error) => isRetryableError(error),
      }
    );
  } catch (error) {
    const err = new ExternalServiceError('Redis', 'Cache delete failed', error as Error);
    ErrorLogger.logExternalService(err, 'cache-delete', { key });
  }
}

/**
 * Deletes all cached values matching a pattern with proper error handling
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await withRetry(
        () => redis.del(...keys),
        {
          maxRetries: 2,
          initialDelay: 100,
          shouldRetry: (error) => isRetryableError(error),
        }
      );
    }
  } catch (error) {
    const err = new ExternalServiceError('Redis', 'Cache delete pattern failed', error as Error);
    ErrorLogger.logExternalService(err, 'cache-delete-pattern', { pattern });
  }
}

export async function cacheInvalidatePost(postId: string): Promise<void> {
  await Promise.all([
    cacheDelete(CACHE_KEYS.POST(postId)),
    cacheDeletePattern('posts:*'),
  ]);
}

export async function cacheInvalidateTask(taskId: string, userId?: string): Promise<void> {
  const promises = [cacheDelete(CACHE_KEYS.TASK(taskId))];

  if (userId) {
    promises.push(cacheDelete(CACHE_KEYS.TASKS(userId)));
  }

  await Promise.all(promises);
}

export async function cacheInvalidateUser(userId: string): Promise<void> {
  await Promise.all([
    cacheDelete(CACHE_KEYS.USER_PROFILE(userId)),
    cacheDelete(CACHE_KEYS.USER_VOTES(userId)),
    cacheDelete(CACHE_KEYS.TASKS(userId)),
  ]);
}
