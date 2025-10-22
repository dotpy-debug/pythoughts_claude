/**
 * Real-time Analytics Hooks
 *
 * React hooks for real-time analytics tracking and updates
 * Features:
 * - Real-time data subscriptions
 * - Auto-refresh intervals
 * - Live metric updates
 * - WebSocket connections
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Live metric data
 */
export interface LiveMetric {
  value: number;
  change: number;
  lastUpdated: Date;
}

/**
 * Real-time analytics options
 */
export interface RealTimeAnalyticsOptions {
  /**
   * Refresh interval in milliseconds
   * @default 30000 (30 seconds)
   */
  refreshInterval?: number;

  /**
   * Enable real-time subscriptions
   * @default true
   */
  enableRealtime?: boolean;

  /**
   * Metric to track
   */
  metric?: 'views' | 'reads' | 'votes' | 'comments' | 'all';
}

/**
 * Hook for tracking real-time analytics
 */
export function useRealTimeAnalytics(
  userId: string,
  options: RealTimeAnalyticsOptions = {}
) {
  const {
    refreshInterval = 30000,
    enableRealtime = true,
    metric = 'all',
  } = options;

  const [metrics, setMetrics] = useState<Record<string, LiveMetric>>({
    views: { value: 0, change: 0, lastUpdated: new Date() },
    reads: { value: 0, change: 0, lastUpdated: new Date() },
    votes: { value: 0, change: 0, lastUpdated: new Date() },
    comments: { value: 0, change: 0, lastUpdated: new Date() },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousValuesRef = useRef<Record<string, number>>({});

  // Fetch current metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get post analytics for the user
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('post_analytics')
        .select('views, reads')
        .eq('author_id', userId)
        .gte('date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (analyticsError) throw analyticsError;

      // Get votes and comments
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, vote_count')
        .eq('author_id', userId);

      if (postsError) throw postsError;

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id')
        .in('post_id', (postsData || []).map((p) => p.id));

      if (commentsError) throw commentsError;

      // Calculate totals
      const totalViews = (analyticsData || []).reduce(
        (sum, row) => sum + (row.views || 0),
        0
      );
      const totalReads = (analyticsData || []).reduce(
        (sum, row) => sum + (row.reads || 0),
        0
      );
      const totalVotes = (postsData || []).reduce(
        (sum, post) => sum + (post.vote_count || 0),
        0
      );
      const totalComments = commentsData?.length || 0;

      // Calculate changes
      const newMetrics: Record<string, LiveMetric> = {
        views: {
          value: totalViews,
          change: previousValuesRef.current.views
            ? totalViews - previousValuesRef.current.views
            : 0,
          lastUpdated: new Date(),
        },
        reads: {
          value: totalReads,
          change: previousValuesRef.current.reads
            ? totalReads - previousValuesRef.current.reads
            : 0,
          lastUpdated: new Date(),
        },
        votes: {
          value: totalVotes,
          change: previousValuesRef.current.votes
            ? totalVotes - previousValuesRef.current.votes
            : 0,
          lastUpdated: new Date(),
        },
        comments: {
          value: totalComments,
          change: previousValuesRef.current.comments
            ? totalComments - previousValuesRef.current.comments
            : 0,
          lastUpdated: new Date(),
        },
      };

      // Update previous values
      previousValuesRef.current = {
        views: totalViews,
        reads: totalReads,
        votes: totalVotes,
        comments: totalComments,
      };

      setMetrics(newMetrics);
    } catch (err) {
      console.error('Error fetching real-time metrics:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Setup real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    // Subscribe to post_analytics changes
    const channel = supabase
      .channel(`analytics_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_analytics',
          filter: `author_id=eq.${userId}`,
        },
        () => {
          // Refresh metrics when analytics data changes
          fetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_votes',
        },
        () => {
          // Refresh when votes change
          fetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        },
        () => {
          // Refresh when comments added
          fetchMetrics();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [userId, enableRealtime, fetchMetrics]);

  // Setup polling interval
  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    // Setup interval
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchMetrics, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMetrics, refreshInterval]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}

/**
 * Hook for tracking live post views
 */
export function useLivePostViews(postId: string) {
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Fetch initial count
    const fetchViewCount = async () => {
      try {
        const { count, error } = await supabase
          .from('post_view_events')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);

        if (error) throw error;
        setViewCount(count || 0);
      } catch (err) {
        console.error('Error fetching view count:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchViewCount();

    // Subscribe to new views
    const channel = supabase
      .channel(`post_views_${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_view_events',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          setViewCount((prev) => prev + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [postId]);

  return { viewCount, loading };
}

/**
 * Hook for tracking session analytics
 */
export function useSessionAnalytics() {
  const [sessionData, setSessionData] = useState({
    duration: 0,
    pagesViewed: 0,
    eventsTriggered: 0,
  });

  const sessionStartRef = useRef(Date.now());
  const pagesViewedRef = useRef(new Set<string>());
  const eventsRef = useRef(0);

  useEffect(() => {
    // Track page views
    const trackPageView = () => {
      pagesViewedRef.current.add(window.location.pathname);
      updateSessionData();
    };

    // Track events
    const trackEvent = () => {
      eventsRef.current++;
      updateSessionData();
    };

    // Update session data
    const updateSessionData = () => {
      setSessionData({
        duration: Math.floor((Date.now() - sessionStartRef.current) / 1000),
        pagesViewed: pagesViewedRef.current.size,
        eventsTriggered: eventsRef.current,
      });
    };

    // Setup listeners
    window.addEventListener('popstate', trackPageView);
    window.addEventListener('click', trackEvent);

    // Update duration every second
    const interval = setInterval(updateSessionData, 1000);

    // Initial page view
    trackPageView();

    return () => {
      window.removeEventListener('popstate', trackPageView);
      window.removeEventListener('click', trackEvent);
      clearInterval(interval);
    };
  }, []);

  return sessionData;
}

/**
 * Hook for tracking scroll depth
 */
export function useScrollDepth(onScrollMilestone?: (depth: number) => void) {
  const [scrollDepth, setScrollDepth] = useState(0);
  const [maxScrollDepth, setMaxScrollDepth] = useState(0);
  const milestonesRef = useRef(new Set<number>());

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;

      const depth = Math.round(
        (scrollTop / (documentHeight - windowHeight)) * 100
      );

      setScrollDepth(depth);
      setMaxScrollDepth((prev) => Math.max(prev, depth));

      // Track milestones (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      milestones.forEach((milestone) => {
        if (
          depth >= milestone &&
          !milestonesRef.current.has(milestone)
        ) {
          milestonesRef.current.add(milestone);
          onScrollMilestone?.(milestone);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [onScrollMilestone]);

  return { scrollDepth, maxScrollDepth };
}

export default useRealTimeAnalytics;
