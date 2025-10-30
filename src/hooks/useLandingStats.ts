/**
 * useLandingStats Hook - Landing Page Statistics
 *
 * FEATURES:
 * - Fetches landing page statistics (total blogs, active writers, views)
 * - Auto-refresh every 5 minutes
 * - Redis caching with 5-minute TTL
 * - Error handling with fallback
 * - Loading states
 *
 * USAGE:
 * const { stats, loading, error, refresh } = useLandingStats();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getLandingStats, LandingStats } from '../services/featured';
import { logger } from '../lib/logger';

interface UseLandingStatsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseLandingStatsReturn {
  stats: LandingStats | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastRefreshed: Date | null;
}

export function useLandingStats(
  options: UseLandingStatsOptions = {}
): UseLandingStatsReturn {
  const {
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
  } = options;

  const [stats, setStats] = useState<LandingStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  /**
   * Fetch landing page stats from the API
   */
  const fetchLandingStats = useCallback(async (showLoading = true) => {
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

      const fetchedStats = await getLandingStats();

      if (mountedRef.current) {
        setStats(fetchedStats);
        setLastRefreshed(new Date());
        setError(null);
      }
// @ts-expect-error - LandingStats extends LogMetadata conceptually

      logger.debug('Landing stats fetched successfully', fetchedStats);
    } catch (err) {
      if (mountedRef.current && err !== 'AbortError') {
        const error =
          err instanceof Error ? err : new Error('Failed to fetch landing stats');
        setError(error);
        logger.error('Error fetching landing stats', error);
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
    await fetchLandingStats(false);
  }, [fetchLandingStats]);

  /**
   * Initial load and auto-refresh setup
   */
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchLandingStats();

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchLandingStats(false);
      }, refreshInterval);

      logger.debug('Landing stats auto-refresh enabled', {
        interval: refreshInterval,
      });
    }

    // Cleanup
    return () => {
      mountedRef.current = false;

      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLandingStats, autoRefresh, refreshInterval]);

  return {
    stats,
    loading,
    error,
    refresh,
    lastRefreshed,
  };
}
