import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface TimeSeriesData {
  date: string;
  views: number;
  votes: number;
  comments: number;
  engagement: number;
}

export interface TrafficSource {
  source: string;
  count: number;
  percentage: number;
}

export interface TopReferrer {
  referrer: string;
  count: number;
}

export interface ReadingMetrics {
  avgReadTime: number;
  completionRate: number;
  totalReads: number;
}

/**
 * Get time-series engagement data for a user's posts
 */
export async function getEngagementTimeSeries(
  userId: string,
  days: number = 30
): Promise<TimeSeriesData[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user's posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, created_at')
      .eq('author_id', userId)
      .gte('created_at', startDate.toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) return [];

    const postIds = posts.map(p => p.id);

    // Get views by date
    const { data: views, error: viewsError } = await supabase
      .from('post_views')
      .select('created_at')
      .in('post_id', postIds)
      .gte('created_at', startDate.toISOString());

    // Get votes by date
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('created_at')
      .in('post_id', postIds)
      .gte('created_at', startDate.toISOString());

    // Get comments by date
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('created_at')
      .in('post_id', postIds)
      .gte('created_at', startDate.toISOString());

    // Group by date
    const dataByDate: Map<string, TimeSeriesData> = new Map();

    // Initialize all dates
    for (let index = 0; index < days; index++) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const dateString = date.toISOString().split('T')[0];
      dataByDate.set(dateString, {
        date: dateString,
        views: 0,
        votes: 0,
        comments: 0,
        engagement: 0,
      });
    }

    // Aggregate views
    if (!viewsError && views) {
      for (const view of views) {
        const dateString = view.created_at.split('T')[0];
        const data = dataByDate.get(dateString);
        if (data) data.views++;
      }
    }

    // Aggregate votes
    if (!votesError && votes) {
      for (const vote of votes) {
        const dateString = vote.created_at.split('T')[0];
        const data = dataByDate.get(dateString);
        if (data) data.votes++;
      }
    }

    // Aggregate comments
    if (!commentsError && comments) {
      for (const comment of comments) {
        const dateString = comment.created_at.split('T')[0];
        const data = dataByDate.get(dateString);
        if (data) data.comments++;
      }
    }

    // Calculate engagement score (views * 0.1 + votes * 2 + comments * 1.5)
    for (const data of dataByDate.values()) {
      data.engagement = data.views * 0.1 + data.votes * 2 + data.comments * 1.5;
    }

    return [...dataByDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    logger.error('Error fetching engagement time series', { errorDetails: error, userId });
    return [];
  }
}

/**
 * Get traffic sources for a user's posts
 */
export async function getTrafficSources(userId: string): Promise<TrafficSource[]> {
  try {
    // Get user's posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', userId);

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) return [];

    const postIds = posts.map(p => p.id);

    // Get views with referrers
    const { data: views, error: viewsError } = await supabase
      .from('post_views')
      .select('referrer')
      .in('post_id', postIds);

    if (viewsError) throw viewsError;
    if (!views || views.length === 0) return [];

    // Categorize traffic sources
    const sourceCounts: Map<string, number> = new Map();
    const total = views.length;

    for (const view of views) {
      const referrer = view.referrer || 'Direct';

      let source = 'Direct';
      if (referrer && referrer !== 'Direct') {
        try {
          const url = new URL(referrer);
          const hostname = url.hostname.replace('www.', '');

          if (hostname.includes('google')) source = 'Google';
          else if (hostname.includes('twitter') || hostname.includes('t.co')) source = 'Twitter';
          else if (hostname.includes('facebook')) source = 'Facebook';
          else if (hostname.includes('reddit')) source = 'Reddit';
          else if (hostname.includes('github')) source = 'GitHub';
          else if (hostname.includes('linkedin')) source = 'LinkedIn';
          else source = hostname;
        } catch {
          source = 'Direct';
        }
      }

      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    }

    return [...sourceCounts.entries()]
      .map(([source, count]) => ({
        source,
        count,
        percentage: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 sources
  } catch (error) {
    logger.error('Error fetching traffic sources', { errorDetails: error, userId });
    return [];
  }
}

/**
 * Get top referrers for a user's posts
 */
export async function getTopReferrers(userId: string, limit: number = 10): Promise<TopReferrer[]> {
  try {
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', userId);

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) return [];

    const postIds = posts.map(p => p.id);

    const { data: views, error: viewsError } = await supabase
      .from('post_views')
      .select('referrer')
      .in('post_id', postIds)
      .not('referrer', 'is', null);

    if (viewsError) throw viewsError;
    if (!views || views.length === 0) return [];

    const referrerCounts: Map<string, number> = new Map();

    for (const view of views) {
      if (view.referrer) {
        referrerCounts.set(view.referrer, (referrerCounts.get(view.referrer) || 0) + 1);
      }
    }

    return [...referrerCounts.entries()]
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    logger.error('Error fetching top referrers', { errorDetails: error, userId });
    return [];
  }
}

/**
 * Get reading metrics for a user's blog posts
 */
export async function getReadingMetrics(userId: string): Promise<ReadingMetrics> {
  try {
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', userId)
      .eq('post_type', 'blog');

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return { avgReadTime: 0, completionRate: 0, totalReads: 0 };
    }

    const postIds = posts.map(p => p.id);

    const { data: readingProgress, error: progressError } = await supabase
      .from('reading_progress')
      .select('reading_time_seconds, completed')
      .in('post_id', postIds);

    if (progressError) throw progressError;
    if (!readingProgress || readingProgress.length === 0) {
      return { avgReadTime: 0, completionRate: 0, totalReads: 0 };
    }

    const totalReads = readingProgress.length;
    const completedReads = readingProgress.filter(p => p.completed).length;
    const totalReadTime = readingProgress.reduce(
      (sum, p) => sum + (p.reading_time_seconds || 0),
      0
    );

    return {
      avgReadTime: Math.round(totalReadTime / totalReads),
      completionRate: totalReads > 0 ? (completedReads / totalReads) * 100 : 0,
      totalReads,
    };
  } catch (error) {
    logger.error('Error fetching reading metrics', { errorDetails: error, userId });
    return { avgReadTime: 0, completionRate: 0, totalReads: 0 };
  }
}
