import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheInvalidatePost,
  cacheInvalidateTask,
  cacheInvalidateUser,
  CACHE_KEYS,
  CACHE_TTL,
} from './redis';

// Mock ioredis
vi.mock('ioredis', () => {
  const mockRedis = {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
  };
  return {
    default: vi.fn(() => mockRedis),
  };
});

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock env
vi.mock('./env', () => ({
  env: {},
  serverEnv: {
    REDIS_URL: 'redis://localhost:6379',
  },
}));

describe('Redis Cache Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CACHE_KEYS', () => {
    it('generates correct cache keys for posts', () => {
      expect(CACHE_KEYS.POSTS('news')).toBe('posts:news');
      expect(CACHE_KEYS.POST('post-123')).toBe('post:post-123');
    });

    it('generates correct cache keys for users', () => {
      expect(CACHE_KEYS.USER_PROFILE('user-456')).toBe('profile:user-456');
      expect(CACHE_KEYS.USER_VOTES('user-789')).toBe('votes:user-789');
    });

    it('generates correct cache keys for tasks', () => {
      expect(CACHE_KEYS.TASKS('user-123')).toBe('tasks:user-123');
      expect(CACHE_KEYS.TASK('task-456')).toBe('task:task-456');
    });

    it('generates correct cache keys for trending', () => {
      expect(CACHE_KEYS.TRENDING_POSTS(20)).toBe('trending:posts:limit:20');
      expect(CACHE_KEYS.TRENDING_CATEGORY('python', 10)).toBe('trending:posts:category:python:limit:10');
      expect(CACHE_KEYS.TRENDING_STATS()).toBe('trending:stats');
      expect(CACHE_KEYS.TRENDING_SCORE('post-123')).toBe('trending:score:post-123');
    });
  });

  describe('CACHE_TTL', () => {
    it('has correct TTL values', () => {
      expect(CACHE_TTL.SHORT).toBe(60);
      expect(CACHE_TTL.MEDIUM).toBe(300);
      expect(CACHE_TTL.LONG).toBe(1800);
      expect(CACHE_TTL.VERY_LONG).toBe(3600);
    });
  });

  describe('cacheGet', () => {
    it('returns parsed JSON data from cache', async () => {
      const mockData = { id: '1', name: 'Test' };
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.get).mockResolvedValue(JSON.stringify(mockData));

      const result = await cacheGet<typeof mockData>('test-key');

      expect(result).toEqual(mockData);
    });

    it('returns null when cache key does not exist', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.get).mockResolvedValue(null);

      const result = await cacheGet('nonexistent-key');

      expect(result).toBeNull();
    });

    it('returns null and logs error on failure', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.get).mockRejectedValue(new Error('Redis error'));

      const result = await cacheGet('error-key');

      expect(result).toBeNull();
    });
  });

  describe('cacheSet', () => {
    it('stores data in cache with TTL', async () => {
      const mockData = { id: '1', name: 'Test' };
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.setex).mockResolvedValue('OK');

      await cacheSet('test-key', mockData, 300);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        300,
        JSON.stringify(mockData)
      );
    });

    it('uses default TTL when not provided', async () => {
      const mockData = { id: '1', name: 'Test' };
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.setex).mockResolvedValue('OK');

      await cacheSet('test-key', mockData);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        CACHE_TTL.MEDIUM,
        JSON.stringify(mockData)
      );
    });

    it('handles errors gracefully', async () => {
      const mockData = { id: '1', name: 'Test' };
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.setex).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(cacheSet('error-key', mockData)).resolves.not.toThrow();
    });
  });

  describe('cacheDelete', () => {
    it('deletes cache key', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.del).mockResolvedValue(1);

      await cacheDelete('test-key');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
    });

    it('handles errors gracefully', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.del).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(cacheDelete('error-key')).resolves.not.toThrow();
    });
  });

  describe('cacheDeletePattern', () => {
    it('deletes all keys matching pattern', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.keys).mockResolvedValue(['posts:1', 'posts:2', 'posts:3']);
      vi.mocked(mockRedisInstance.del).mockResolvedValue(3);

      await cacheDeletePattern('posts:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('posts:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('posts:1', 'posts:2', 'posts:3');
    });

    it('does nothing when no keys match pattern', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.keys).mockResolvedValue([]);

      await cacheDeletePattern('nonexistent:*');

      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.keys).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(cacheDeletePattern('error:*')).resolves.not.toThrow();
    });
  });

  describe('cacheInvalidatePost', () => {
    it('invalidates post cache and posts list', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.del).mockResolvedValue(1);
      vi.mocked(mockRedisInstance.keys).mockResolvedValue(['posts:news', 'posts:blog']);

      await cacheInvalidatePost('post-123');

      // Should delete specific post and posts pattern
      expect(mockRedisInstance.del).toHaveBeenCalledWith('post:post-123');
    });
  });

  describe('cacheInvalidateTask', () => {
    it('invalidates task cache and user tasks list', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.del).mockResolvedValue(1);

      await cacheInvalidateTask('task-123', 'user-456');

      // Should delete specific task and user's tasks
      expect(mockRedisInstance.del).toHaveBeenCalled();
    });

    it('only invalidates task when userId not provided', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.del).mockResolvedValue(1);

      await cacheInvalidateTask('task-123');

      // Should only delete specific task
      expect(mockRedisInstance.del).toHaveBeenCalled();
    });
  });

  describe('cacheInvalidateUser', () => {
    it('invalidates all user-related caches', async () => {
      const Redis = await import('ioredis');
      const mockRedisInstance = new Redis.default();
      vi.mocked(mockRedisInstance.del).mockResolvedValue(1);

      await cacheInvalidateUser('user-123');

      // Should delete profile, votes, and tasks
      expect(mockRedisInstance.del).toHaveBeenCalled();
    });
  });
});
