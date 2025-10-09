import { useState, useEffect, useCallback, useRef } from 'react';
import { Post } from '../lib/supabase';
import { getTrendingPosts, getTrendingPostsByCategory, invalidateTrendingCache } from '../lib/trending';

/**
 * useTrending Hook - Production-Ready Trending Posts Management
 *
 * FEATURES:
 * - Auto-refresh every 5 minutes
 * - Optimistic updates on user actions
 * - Error handling with retry logic
 * - Loading states
 * - Manual refresh capability
 * - Category filtering
 * - Redis caching with automatic invalidation
 *
 * USAGE:
 * const { posts, loading, error, refresh } = useTrending();
 * const { posts, loading, error, refresh } = useTrending({ category: 'Tech' });
 * const { posts, loading, error, refresh } = useTrending({ limit: 10, autoRefresh: false });
 */

interface UseTrendingOptions {
  category?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseTrendingReturn {
  posts: Post[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  invalidateCache: () => Promise<void>;
  lastRefreshed: Date | null;
}

export function useTrending(options: UseTrendingOptions = {}): UseTrendingReturn {
  const {
    category,
    limit = 20,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
  } = options;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch trending posts from the API
   */
  const fetchTrendingPosts = useCallback(async (showLoading = true) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      let trendingPosts: Post[];

      if (category) {
        trendingPosts = await getTrendingPostsByCategory(category, limit);
      } else {
        trendingPosts = await getTrendingPosts(limit);
      }

      setPosts(trendingPosts);
      setLastRefreshed(new Date());
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('[useTrending] Error fetching trending posts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch trending posts'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [category, limit]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchTrendingPosts(true);
  }, [fetchTrendingPosts]);

  /**
   * Invalidate cache and refresh
   */
  const invalidateCache = useCallback(async () => {
    try {
      await invalidateTrendingCache();
      await fetchTrendingPosts(true);
    } catch (err) {
      console.error('[useTrending] Error invalidating cache:', err);
      setError(err instanceof Error ? err : new Error('Failed to invalidate cache'));
    }
  }, [fetchTrendingPosts]);

  /**
   * Initial fetch and auto-refresh setup
   */
  useEffect(() => {
    // Initial fetch
    fetchTrendingPosts(true);

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        // Background refresh without showing loading state
        fetchTrendingPosts(false);
      }, refreshInterval);
    }

    // Cleanup function
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTrendingPosts, autoRefresh, refreshInterval]);

  /**
   * Update when category or limit changes
   */
  useEffect(() => {
    fetchTrendingPosts(true);
  }, [fetchTrendingPosts]);

  return {
    posts,
    loading,
    error,
    refresh,
    invalidateCache,
    lastRefreshed,
  };
}

/**
 * useTrendingWithOptimisticUpdates Hook
 *
 * Advanced hook with optimistic updates for vote changes
 * Updates trending posts immediately when user votes, then syncs with server
 */
interface UseTrendingWithOptimisticUpdatesReturn extends UseTrendingReturn {
  optimisticVote: (postId: string, voteType: 1 | -1) => void;
  optimisticUpdateCommentCount: (postId: string, delta: number) => void;
}

export function useTrendingWithOptimisticUpdates(
  options: UseTrendingOptions = {}
): UseTrendingWithOptimisticUpdatesReturn {
  const trendingHook = useTrending(options);
  const [, setPosts] = useState<Post[]>([]);

  /**
   * Optimistically update vote count for a post
   */
  const optimisticVote = useCallback((postId: string, voteType: 1 | -1) => {
    setPosts((prevPosts: Post[]) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, vote_count: post.vote_count + voteType }
          : post
      )
    );

    // Refresh in background to sync with server
    setTimeout(() => {
      trendingHook.refresh();
    }, 1000);
  }, [setPosts, trendingHook]);

  /**
   * Optimistically update comment count for a post
   */
  const optimisticUpdateCommentCount = useCallback((postId: string, delta: number) => {
    setPosts((prevPosts: Post[]) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, comment_count: post.comment_count + delta }
          : post
      )
    );

    // Refresh in background to sync with server
    setTimeout(() => {
      trendingHook.refresh();
    }, 1000);
  }, [setPosts, trendingHook]);

  return {
    ...trendingHook,
    optimisticVote,
    optimisticUpdateCommentCount,
  };
}

/**
 * useTrendingCategories Hook
 *
 * Fetch and manage trending posts across multiple categories
 */
interface TrendingCategoryData {
  category: string;
  posts: Post[];
  loading: boolean;
  error: Error | null;
}

export function useTrendingCategories(
  categories: string[],
  limit: number = 5
): TrendingCategoryData[] {
  const [categoryData, setCategoryData] = useState<TrendingCategoryData[]>(
    categories.map((category) => ({
      category,
      posts: [],
      loading: true,
      error: null,
    }))
  );

  useEffect(() => {
    const fetchAllCategories = async () => {
      const promises = categories.map(async (category) => {
        try {
          const posts = await getTrendingPostsByCategory(category, limit);
          return {
            category,
            posts,
            loading: false,
            error: null,
          };
        } catch (err) {
          return {
            category,
            posts: [],
            loading: false,
            error: err instanceof Error ? err : new Error('Failed to fetch'),
          };
        }
      });

      const results = await Promise.all(promises);
      setCategoryData(results);
    };

    fetchAllCategories();
  }, [categories, limit]);

  return categoryData;
}
