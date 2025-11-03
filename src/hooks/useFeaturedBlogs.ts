/**
 * useFeaturedBlogs Hook - Featured Blogs Management
 *
 * FEATURES:
 * - Auto-refresh every 5 minutes
 * - Redis caching with 5-minute TTL
 * - Error handling with retry logic
 * - Loading states
 * - Manual refresh capability
 * - Category filtering
 * - Configurable limits
 *
 * USAGE:
 * const { blogs, loading, error, refresh } = useFeaturedBlogs();
 * const { blogs, loading, error, refresh } = useFeaturedBlogs({ limit: 5 });
 * const { blogs, loading, error, refresh } = useFeaturedBlogs({ category: 'Tech' });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BlogPost } from '../types/blog';
import { getFeaturedBlogs, FeaturedBlogsOptions } from '../services/featured';
import { logger } from '../lib/logger';

interface UseFeaturedBlogsOptions extends FeaturedBlogsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseFeaturedBlogsReturn {
  blogs: BlogPost[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastRefreshed: Date | null;
}

export function useFeaturedBlogs(
  options: UseFeaturedBlogsOptions = {}
): UseFeaturedBlogsReturn {
  const {
    limit = 3,
    timeWindow = 7,
    category,
    minViews = 50,
    minEngagement = 5,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
  } = options;

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refreshIntervalReference = useRef<NodeJS.Timeout | null>(null);
  const abortControllerReference = useRef<AbortController | null>(null);
  const mountedReference = useRef<boolean>(true);

  /**
   * Fetch featured blogs from the API
   */
  const fetchFeaturedBlogs = useCallback(
    async (showLoading = true) => {
      // Cancel previous request if still pending
      if (abortControllerReference.current) {
        abortControllerReference.current.abort();
      }

      abortControllerReference.current = new AbortController();

      try {
        if (showLoading) {
          setLoading(true);
        }
        setError(null);

        const fetchedBlogs = await getFeaturedBlogs({
          limit,
          timeWindow,
          category,
          minViews,
          minEngagement,
        });

        if (mountedReference.current) {
          setBlogs(fetchedBlogs);
          setLastRefreshed(new Date());
          setError(null);
        }

        logger.debug('Featured blogs fetched successfully', {
          count: fetchedBlogs.length,
          limit,
          category,
        });
      } catch (error_) {
        if (mountedReference.current && error_ !== 'AbortError') {
          const error = error_ instanceof Error ? error_ : new Error('Failed to fetch featured blogs');
          setError(error);
          logger.error('Error fetching featured blogs', error, {
            limit,
            category,
          });
        }
      } finally {
        if (mountedReference.current) {
          setLoading(false);
        }
      }
    },
    [limit, timeWindow, category, minViews, minEngagement]
  );

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchFeaturedBlogs(false);
  }, [fetchFeaturedBlogs]);

  /**
   * Initial load and auto-refresh setup
   */
  useEffect(() => {
    mountedReference.current = true;

    // Initial fetch
    fetchFeaturedBlogs();

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      refreshIntervalReference.current = setInterval(() => {
        fetchFeaturedBlogs(false);
      }, refreshInterval);

      logger.debug('Featured blogs auto-refresh enabled', {
        interval: refreshInterval,
      });
    }

    // Cleanup
    return () => {
      mountedReference.current = false;

      if (refreshIntervalReference.current) {
        clearInterval(refreshIntervalReference.current);
      }

      if (abortControllerReference.current) {
        abortControllerReference.current.abort();
      }
    };
  }, [fetchFeaturedBlogs, autoRefresh, refreshInterval]);

  return {
    blogs,
    loading,
    error,
    refresh,
    lastRefreshed,
  };
}
