/**
 * useBlogOfTheDay Hook - Blog of the Day Management
 *
 * FEATURES:
 * - Fetches the blog of the day using weighted scoring algorithm
 * - Cached until midnight UTC (daily refresh)
 * - Error handling with fallback
 * - Loading states
 * - Manual refresh capability
 *
 * ALGORITHM:
 * dailyScore = (trending_score × 0.4) +
 *              (view_count_today × 0.3) +
 *              (clap_count × 0.2) +
 *              (comment_count × 0.1)
 *
 * USAGE:
 * const { blog, loading, error, refresh } = useBlogOfTheDay();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BlogPost } from '../types/blog';
import { getBlogOfTheDay } from '../services/featured';
import { logger } from '../lib/logger';

interface UseBlogOfTheDayReturn {
  blog: BlogPost | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastRefreshed: Date | null;
}

export function useBlogOfTheDay(): UseBlogOfTheDayReturn {
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);
  const midnightCheckRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch blog of the day from the API
   */
  const fetchBlogOfTheDay = useCallback(async (showLoading = true) => {
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

      const fetchedBlog = await getBlogOfTheDay();

      if (mountedRef.current) {
        setBlog(fetchedBlog);
        setLastRefreshed(new Date());
        setError(null);
      }

      if (fetchedBlog) {
        logger.debug('Blog of the day fetched successfully', {
          id: fetchedBlog.id,
          title: fetchedBlog.title,
        });
      } else {
        logger.warn('No blog of the day available');
      }
    } catch (err) {
      if (mountedRef.current && err !== 'AbortError') {
        const error =
          err instanceof Error ? err : new Error('Failed to fetch blog of the day');
        setError(error);
        logger.error('Error fetching blog of the day', error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchBlogOfTheDay(false);
  }, [fetchBlogOfTheDay]);

  /**
   * Calculate milliseconds until midnight UTC
   */
  const getMillisecondsUntilMidnight = useCallback((): number => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }, []);

  /**
   * Initial load and midnight refresh setup
   */
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchBlogOfTheDay();

    // Set up midnight refresh
    const scheduleMidnightRefresh = () => {
      const msUntilMidnight = getMillisecondsUntilMidnight();

      logger.debug('Scheduling blog of the day midnight refresh', {
        msUntilMidnight,
        refreshAt: new Date(Date.now() + msUntilMidnight).toISOString(),
      });

      midnightCheckRef.current = setTimeout(() => {
        logger.info('Midnight reached - refreshing blog of the day');
        fetchBlogOfTheDay(false);
        // Schedule next midnight refresh
        scheduleMidnightRefresh();
      }, msUntilMidnight);
    };

    scheduleMidnightRefresh();

    // Cleanup
    return () => {
      mountedRef.current = false;

      if (midnightCheckRef.current) {
        clearTimeout(midnightCheckRef.current);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBlogOfTheDay, getMillisecondsUntilMidnight]);

  return {
    blog,
    loading,
    error,
    refresh,
    lastRefreshed,
  };
}
