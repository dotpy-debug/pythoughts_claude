/**
 * Analytics Server Actions
 *
 * Server actions for platform analytics and insights:
 * - User growth metrics
 * - Content statistics
 * - Engagement analytics
 * - Trending data
 */

import { supabase } from '../lib/supabase';
import { requireRole, ADMIN_ROLES } from '../lib/admin-auth';
import { logger } from '../lib/logger';

export interface AnalyticsData {
  userGrowth: { label: string; value: number }[];
  contentStats: { label: string; value: number; color?: string }[];
  engagementMetrics: { label: string; value: number }[];
  topCategories: { label: string; value: number }[];
  topTags: { label: string; value: number }[];
  recentActivity: {
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    activeUsers: number;
  };
  trendingPosts: Array<{
    id: string;
    title: string;
    vote_count: number;
    comment_count: number;
    view_count: number;
  }>;
}

/**
 * Get comprehensive analytics data
 */
export async function getAnalytics(params: {
  currentUserId: string;
  dateRange?: '7d' | '30d' | '90d' | '1y';
}): Promise<{ data: AnalyticsData | null; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const dateRange = params.dateRange || '30d';
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;

    // Get user growth data
    const userGrowth = await getUserGrowth(days);

    // Get content statistics
    const contentStats = await getContentStats();

    // Get engagement metrics
    const engagementMetrics = await getEngagementMetrics(days);

    // Get top categories
    const topCategories = await getTopCategories();

    // Get top tags
    const topTags = await getTopTags();

    // Get recent activity
    const recentActivity = await getRecentActivity();

    // Get trending posts
    const trendingPosts = await getTrendingPosts();

    return {
      data: {
        userGrowth,
        contentStats,
        engagementMetrics,
        topCategories,
        topTags,
        recentActivity,
        trendingPosts,
      },
    };
  } catch (error) {
    logger.error('Exception in getAnalytics', { errorDetails: error });
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics',
    };
  }
}

async function getUserGrowth(days: number): Promise<{ label: string; value: number }[]> {
  const result: { label: string; value: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString());

    result.push({
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: count || 0,
    });
  }

  return result;
}

async function getContentStats(): Promise<{ label: string; value: number; color?: string }[]> {
  const [postsCount, commentsCount, tasksCount, draftsCount] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    supabase.from('post_drafts').select('*', { count: 'exact', head: true }),
  ]);

  return [
    { label: 'Posts', value: postsCount.count || 0, color: '#f97316' },
    { label: 'Comments', value: commentsCount.count || 0, color: '#3b82f6' },
    { label: 'Tasks', value: tasksCount.count || 0, color: '#10b981' },
    { label: 'Drafts', value: draftsCount.count || 0, color: '#f59e0b' },
  ];
}

async function getEngagementMetrics(days: number): Promise<{ label: string; value: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [votes, reactions, claps, bookmarks] = await Promise.all([
    supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString()),
    supabase
      .from('reactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString()),
    supabase
      .from('claps')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString()),
    supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString()),
  ]);

  return [
    { label: 'Votes', value: votes.count || 0 },
    { label: 'Reactions', value: reactions.count || 0 },
    { label: 'Claps', value: claps.count || 0 },
    { label: 'Bookmarks', value: bookmarks.count || 0 },
  ];
}

async function getTopCategories(): Promise<{ label: string; value: number }[]> {
  const { data } = await supabase
    .from('categories')
    .select('name, post_count')
    .order('post_count', { ascending: false })
    .limit(5);

  return (data || []).map((cat) => ({
    label: cat.name,
    value: cat.post_count,
  }));
}

async function getTopTags(): Promise<{ label: string; value: number }[]> {
  const { data } = await supabase
    .from('tags')
    .select('name, post_count')
    .order('post_count', { ascending: false })
    .limit(5);

  return (data || []).map((tag) => ({
    label: tag.name,
    value: tag.post_count,
  }));
}

async function getRecentActivity() {
  const [users, posts, comments, activeUsers] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true),
    supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte(
        'last_active_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  return {
    totalUsers: users.count || 0,
    totalPosts: posts.count || 0,
    totalComments: comments.count || 0,
    activeUsers: activeUsers.count || 0,
  };
}

async function getTrendingPosts() {
  const { data } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      vote_count,
      comment_count,
      post_stats (view_count)
    `
    )
    .eq('is_published', true)
    .order('vote_count', { ascending: false })
    .limit(10);

  return (data || []).map((post) => ({
    id: post.id,
    title: post.title,
    vote_count: post.vote_count,
    comment_count: post.comment_count,
    view_count: (post.post_stats as any)?.[0]?.view_count || 0,
  }));
}

/**
 * Export analytics data
 */
export async function exportAnalytics(params: {
  currentUserId: string;
  format: 'json' | 'csv';
}): Promise<{ data: string; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const analytics = await getAnalytics({ currentUserId: params.currentUserId });

    if (!analytics.data) {
      return { data: '', error: 'Failed to fetch analytics' };
    }

    if (params.format === 'json') {
      return { data: JSON.stringify(analytics.data, null, 2) };
    } else {
      // Convert to CSV
      const csv = convertAnalyticsToCSV(analytics.data);
      return { data: csv };
    }
  } catch (error) {
    logger.error('Exception in exportAnalytics', { errorDetails: error });
    return {
      data: '',
      error: error instanceof Error ? error.message : 'Failed to export analytics',
    };
  }
}

function convertAnalyticsToCSV(data: AnalyticsData): string {
  const sections: string[] = [];

  // User Growth
  sections.push('User Growth');
  sections.push('Date,New Users');
  data.userGrowth.forEach((item) => {
    sections.push(`${item.label},${item.value}`);
  });
  sections.push('');

  // Content Stats
  sections.push('Content Statistics');
  sections.push('Type,Count');
  data.contentStats.forEach((item) => {
    sections.push(`${item.label},${item.value}`);
  });
  sections.push('');

  // Engagement Metrics
  sections.push('Engagement Metrics');
  sections.push('Metric,Value');
  data.engagementMetrics.forEach((item) => {
    sections.push(`${item.label},${item.value}`);
  });

  return sections.join('\n');
}
