/**
 * Enhanced Analytics Utilities
 *
 * Advanced analytics data processing and aggregation
 * Features:
 * - Time-series data aggregation
 * - Cohort analysis
 * - Funnel analytics
 * - Heatmap data generation
 * - Statistical calculations
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns';

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

/**
 * Cohort data
 */
export interface CohortData {
  cohort: string;
  size: number;
  retention: Record<number, number>; // day -> retention rate
}

/**
 * Funnel step
 */
export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
  dropoff: number;
}

/**
 * Heatmap cell
 */
export interface HeatmapCell {
  x: number | string;
  y: number | string;
  value: number;
  label?: string;
}

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  percentile95: number;
  stdDev: number;
}

/**
 * Get time series data for multiple metrics
 */
export async function getMultiMetricTimeSeries(
  userId: string,
  metrics: Array<'views' | 'reads' | 'votes' | 'comments'>,
  days: number = 30
): Promise<Record<string, TimeSeriesPoint[]>> {
  const endDate = startOfDay(new Date());
  const startDate = subDays(endDate, days - 1);

  const { data, error } = await supabase
    .from('post_analytics')
    .select('date, views, reads, post_id')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .eq('author_id', userId)
    .order('date', { ascending: true });

  if (error) {
    logger.error('Error fetching time series analytics', {
      errorMessage: error.message,
      userId,
      metrics,
      days,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });
    return {};
  }

  // Get votes and comments data
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select('id, vote_count, created_at')
    .eq('author_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (postsError) {
    logger.error('Error fetching posts data for analytics', {
      errorMessage: postsError.message,
      userId,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });
  }

  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select('post_id, created_at')
    .in(
      'post_id',
      (postsData || []).map((p) => p.id)
    )
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (commentsError) {
    logger.error('Error fetching comments data for analytics', {
      errorMessage: commentsError.message,
      userId,
      postCount: postsData?.length || 0,
    });
  }

  // Create date range
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  // Initialize result
  const result: Record<string, TimeSeriesPoint[]> = {};

  for (const metric of metrics) {
    result[metric] = dateRange.map((date) => ({
      date: format(date, 'yyyy-MM-dd'),
      value: 0,
    }));
  }

  // Aggregate views and reads
  if (data) {
    const dailyAggregates: Record<
      string,
      { views: number; reads: number }
    > = {};

    for (const row of data) {
      if (!dailyAggregates[row.date]) {
        dailyAggregates[row.date] = { views: 0, reads: 0 };
      }
      dailyAggregates[row.date].views += row.views || 0;
      dailyAggregates[row.date].reads += row.reads || 0;
    }

    for (const [date, values] of Object.entries(dailyAggregates)) {
      if (metrics.includes('views')) {
        const point = result.views.find((p) => p.date === date);
        if (point) point.value = values.views;
      }
      if (metrics.includes('reads')) {
        const point = result.reads.find((p) => p.date === date);
        if (point) point.value = values.reads;
      }
    }
  }

  // Aggregate votes
  if (metrics.includes('votes') && postsData) {
    const dailyVotes: Record<string, number> = {};

    for (const post of postsData) {
      const date = format(new Date(post.created_at), 'yyyy-MM-dd');
      if (!dailyVotes[date]) {
        dailyVotes[date] = 0;
      }
      dailyVotes[date] += post.vote_count || 0;
    }

    for (const [date, votes] of Object.entries(dailyVotes)) {
      const point = result.votes.find((p) => p.date === date);
      if (point) point.value = votes;
    }
  }

  // Aggregate comments
  if (metrics.includes('comments') && commentsData) {
    const dailyComments: Record<string, number> = {};

    for (const comment of commentsData) {
      const date = format(new Date(comment.created_at), 'yyyy-MM-dd');
      if (!dailyComments[date]) {
        dailyComments[date] = 0;
      }
      dailyComments[date]++;
    }

    for (const [date, comments] of Object.entries(dailyComments)) {
      const point = result.comments.find((p) => p.date === date);
      if (point) point.value = comments;
    }
  }

  return result;
}

/**
 * Get cohort retention analysis
 */
export async function getCohortAnalysis(
  weeks: number = 12
): Promise<CohortData[]> {
  // This is a simplified version - in production, you'd use the user_cohorts table
  const { data, error } = await supabase
    .from('user_cohorts')
    .select('*')
    .order('cohort_start', { ascending: false })
    .limit(weeks);

  if (error) {
    logger.error('Error fetching cohort data for analysis', {
      errorMessage: error.message,
      weeks,
    });
    return [];
  }

  return (data || []).map((cohort) => ({
    cohort: format(new Date(cohort.cohort_start), 'MMM yyyy'),
    size: cohort.cohort_size || 0,
    retention: cohort.retention_data || {},
  }));
}

/**
 * Get funnel conversion data
 */
export async function getFunnelAnalysis(
  userId: string,
  days: number = 30
): Promise<FunnelStep[]> {
  const startDate = subDays(new Date(), days);

  // Get funnel step counts
  const { data: postsData } = await supabase
    .from('posts')
    .select('id')
    .eq('author_id', userId)
    .gte('created_at', startDate.toISOString());

  const postIds = (postsData || []).map((p) => p.id);

  if (postIds.length === 0) {
    return [];
  }

  // Step 1: Views
  const { count: viewsCount } = await supabase
    .from('post_view_events')
    .select('*', { count: 'exact', head: true })
    .in('post_id', postIds);

  // Step 2: Reads (scroll > 50%)
  const { count: readsCount } = await supabase
    .from('post_view_events')
    .select('*', { count: 'exact', head: true })
    .in('post_id', postIds)
    .gte('scroll_percentage', 50);

  // Step 3: Engagement (votes or comments)
  const { count: votesCount } = await supabase
    .from('post_votes')
    .select('*', { count: 'exact', head: true })
    .in('post_id', postIds);

  const { count: commentsCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .in('post_id', postIds);

  const engagementCount = (votesCount || 0) + (commentsCount || 0);

  // Step 4: Conversions (bookmarks or shares)
  const { count: bookmarksCount } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .in('post_id', postIds);

  const totalViews = viewsCount || 0;

  const steps: FunnelStep[] = [
    {
      step: 'Views',
      count: totalViews,
      percentage: 100,
      dropoff: 0,
    },
    {
      step: 'Reads',
      count: readsCount || 0,
      percentage: totalViews ? ((readsCount || 0) / totalViews) * 100 : 0,
      dropoff: totalViews ? ((totalViews - (readsCount || 0)) / totalViews) * 100 : 0,
    },
    {
      step: 'Engagement',
      count: engagementCount,
      percentage: totalViews ? (engagementCount / totalViews) * 100 : 0,
      dropoff: totalViews
        ? (((readsCount || 0) - engagementCount) / totalViews) * 100
        : 0,
    },
    {
      step: 'Conversions',
      count: bookmarksCount || 0,
      percentage: totalViews ? ((bookmarksCount || 0) / totalViews) * 100 : 0,
      dropoff: totalViews
        ? ((engagementCount - (bookmarksCount || 0)) / totalViews) * 100
        : 0,
    },
  ];

  return steps;
}

/**
 * Get heatmap data for post engagement by day/hour
 */
export async function getEngagementHeatmap(
  userId: string,
  days: number = 30
): Promise<HeatmapCell[]> {
  const startDate = subDays(new Date(), days);

  const { data, error } = await supabase
    .from('post_view_events')
    .select('created_at, post_id')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString());

  if (error || !data) {
    logger.error('Error fetching heatmap data for engagement analysis', {
      errorMessage: error?.message || 'No data returned',
      userId,
      days,
      startDate: startDate.toISOString(),
    });
    return [];
  }

  // Group by day of week and hour
  const heatmapData: Record<string, Record<string, number>> = {};

  for (const event of data) {
    const date = new Date(event.created_at);
    const dayOfWeek = format(date, 'EEEE');
    const hour = date.getHours();

    if (!heatmapData[dayOfWeek]) {
      heatmapData[dayOfWeek] = {};
    }
    if (!heatmapData[dayOfWeek][hour]) {
      heatmapData[dayOfWeek][hour] = 0;
    }
    heatmapData[dayOfWeek][hour]++;
  }

  // Convert to heatmap cells
  const cells: HeatmapCell[] = [];
  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  for (const [dayIndex, day] of daysOfWeek.entries()) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({
        x: hour,
        y: dayIndex,
        value: heatmapData[day]?.[hour] || 0,
        label: `${day} ${hour}:00`,
      });
    }
  }

  return cells;
}

/**
 * Calculate statistical summary
 */
export function calculateSummary(values: number[]): AnalyticsSummary {
  if (values.length === 0) {
    return {
      total: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      percentile95: 0,
      stdDev: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;

  // Median
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  // Min/Max
  const min = sorted[0];
  const max = sorted.at(-1) ?? sorted[sorted.length - 1];

  // 95th percentile
  const p95Index = Math.ceil(sorted.length * 0.95) - 1;
  const percentile95 = sorted[p95Index];

  // Standard deviation
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    values.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    total,
    average,
    median,
    min,
    max,
    percentile95,
    stdDev: standardDeviation,
  };
}

/**
 * Get growth rate between two time periods
 */
export function calculateGrowthRate(
  currentValue: number,
  previousValue: number
): number {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * Get top performing content
 */
export async function getTopPerformingPosts(
  userId: string,
  metric: 'views' | 'reads' | 'engagement_rate' = 'views',
  limit: number = 10,
  days?: number
): Promise<
  Array<{
    id: string;
    title: string;
    value: number;
    views: number;
    reads: number;
    engagement_rate: number;
  }>
> {
  let query = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      created_at
    `
    )
    .eq('author_id', userId)
    .eq('is_deleted', false);

  if (days) {
    const startDate = subDays(new Date(), days);
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data: posts, error } = await query.limit(100);

  if (error || !posts) {
    logger.error('Error fetching top performing posts', {
      errorMessage: error?.message || 'No posts returned',
      userId,
      metric,
      limit,
      days,
    });
    return [];
  }

  // Get analytics for these posts
  const postIds = posts.map((p) => p.id);

  const { data: analyticsData } = await supabase
    .from('post_analytics')
    .select('post_id, views, reads, engagement_rate')
    .in('post_id', postIds);

  if (!analyticsData) {
    return [];
  }

  // Aggregate analytics per post
  const postAnalytics = analyticsData.reduce(
    (accumulator, row) => {
      if (!accumulator[row.post_id]) {
        accumulator[row.post_id] = { views: 0, reads: 0, engagement_rate: 0, count: 0 };
      }
      accumulator[row.post_id].views += row.views || 0;
      accumulator[row.post_id].reads += row.reads || 0;
      accumulator[row.post_id].engagement_rate += row.engagement_rate || 0;
      accumulator[row.post_id].count++;
      return accumulator;
    },
    {} as Record<
      string,
      { views: number; reads: number; engagement_rate: number; count: number }
    >
  );

  // Combine and sort
  const results = posts
    .map((post) => {
      const analytics = postAnalytics[post.id];
      if (!analytics) return null;

      const avgEngagementRate = analytics.engagement_rate / analytics.count;

      return {
        id: post.id,
        title: post.title,
        value:
          metric === 'views'
            ? analytics.views
            : (metric === 'reads'
              ? analytics.reads
              : avgEngagementRate),
        views: analytics.views,
        reads: analytics.reads,
        engagement_rate: avgEngagementRate,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  return results;
}
