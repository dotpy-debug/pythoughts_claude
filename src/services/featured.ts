/**
 * Featured Content Service
 *
 * Manages featured blogs and blog of the day selection with:
 * - Featured blogs query with trending algorithm
 * - Blog of the day scoring system
 * - Redis caching for performance
 * - Cache invalidation strategies
 */

import { supabase } from '../lib/supabase';
import { BlogPost, TOCItem } from '../types/blog';
import { logger } from '../lib/logger';
import {
  cacheGet,
  cacheSet,
  cacheDeletePattern,
  CACHE_TTL,
} from '../lib/redis';
import { JSONContent } from '@tiptap/react';

/**
 * Cache keys for featured content
 */
export const FEATURED_CACHE_KEYS = {
  FEATURED_BLOGS: (limit: number, category?: string) =>
    category
      ? `featured:blogs:category:${category}:limit:${limit}`
      : `featured:blogs:limit:${limit}`,
  BLOG_OF_THE_DAY: (date: string) => `featured:blog-of-day:${date}`,
  LANDING_STATS: () => 'featured:landing-stats',
  LATEST_BLOGS: (limit: number) => `featured:latest:${limit}`,
};

/**
 * Options for fetching featured blogs
 */
export interface FeaturedBlogsOptions {
  limit?: number;
  timeWindow?: number; // days
  category?: string;
  minViews?: number;
  minEngagement?: number;
}

/**
 * Landing page statistics
 */
export interface LandingStats {
  totalBlogs: number;
  activeWriters: number;
  totalViews: number;
  blogsPublishedToday: number;
  timestamp: string;
}

/**
 * Get featured blogs with trending algorithm
 *
 * Featured blogs are selected based on:
 * - Trending score (weighted engagement + velocity)
 * - View count
 * - Publish date (recency)
 * - Time window (default: last 7 days)
 *
 * @param options Featured blogs query options
 * @returns Array of featured blog posts
 */
export async function getFeaturedBlogs(
  options: FeaturedBlogsOptions = {}
): Promise<BlogPost[]> {
  const {
    limit = 3,
    timeWindow = 7,
    category,
    minViews = 50,
    // minEngagement = 5, // Unused - may be needed for filtering low-engagement posts
  } = options;

  const cacheKey = FEATURED_CACHE_KEYS.FEATURED_BLOGS(limit, category);

  try {
    // Try cache first
    const cached = await cacheGet<BlogPost[]>(cacheKey);
    if (cached) {
      logger.debug('Featured blogs cache hit', { cacheKey, count: cached.length });
      return cached;
    }

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - timeWindow);

    // Build query
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        slug,
        subtitle,
        content_html,
        content_json,
        toc_data,
        author_id,
        cover_image:image_url,
        cover_image_alt,
        status,
        tags,
        category,
        reading_time_minutes,
        word_count,
        meta_title,
        meta_description,
        og_image,
        canonical_url,
        series_id,
        series_order,
        published_at,
        created_at,
        updated_at,
        view_count,
        clap_count,
        comment_count,
        trending_score,
        profiles:author_id (
          id,
          username,
          avatar_url,
          bio,
          follower_count
        )
      `)
      .eq('post_type', 'blog')
      .eq('status', 'published')
      .gte('published_at', dateThreshold.toISOString())
      .gte('view_count', minViews);

    // Add category filter if specified
    if (category) {
      query = query.eq('category', category);
    }

    // Order by trending score and view count
    const { data, error } = await query
      .order('trending_score', { ascending: false })
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching featured blogs', error as Error, {
        options,
      });
      throw error;
    }

    // Transform data to BlogPost format
    const blogs: BlogPost[] = (data || []).map((post) => ({
      id: post.id as string,
      title: post.title as string,
      slug: post.slug as string,
      summary: post.subtitle as string | undefined,
      content_json: (post.content_json as JSONContent) || { type: 'doc', content: [] },
      content_html: (post.content_html as string) || '',
      toc_data: (post.toc_data || []) as TOCItem[],
      author_id: post.author_id as string,
      author: Array.isArray(post.profiles) && post.profiles.length > 0
        ? {
            id: post.profiles[0].id,
            username: post.profiles[0].username,
            avatar_url: post.profiles[0].avatar_url,
            bio: post.profiles[0].bio,
            follower_count: post.profiles[0].follower_count,
          }
        : undefined,
      cover_image: post.cover_image as string | undefined,
      cover_image_alt: post.cover_image_alt as string | undefined,
      status: (post.status as 'draft' | 'published' | 'scheduled') || 'published',
      tags: (post.tags || []) as string[],
      category: post.category as string | undefined,
      reading_time_minutes: (post.reading_time_minutes || 0) as number,
      word_count: (post.word_count || 0) as number,
      meta_title: post.meta_title as string | undefined,
      meta_description: post.meta_description as string | undefined,
      og_image: post.og_image as string | undefined,
      canonical_url: post.canonical_url as string | undefined,
      series_id: post.series_id as string | undefined,
      series_order: post.series_order as number | undefined,
      published_at: post.published_at as string,
      created_at: post.created_at as string,
      updated_at: post.updated_at as string,
    }));

    // Cache for 5 minutes
    await cacheSet(cacheKey, blogs, CACHE_TTL.MEDIUM);

    logger.info('Featured blogs fetched successfully', {
      count: blogs.length,
      options,
    });

    return blogs;
  } catch (error) {
    logger.error('Failed to get featured blogs', error as Error, { options });
    // Return empty array on error to prevent page breaks
    return [];
  }
}

/**
 * Get blog of the day using weighted scoring algorithm
 *
 * Algorithm:
 * dailyScore = (trending_score × 0.4) +
 *              (view_count_today × 0.3) +
 *              (clap_count × 0.2) +
 *              (comment_count × 0.1)
 *
 * Constraints:
 * - Published within last 30 days
 * - Minimum 100 views
 * - Not featured yesterday
 * - Cache winner until midnight UTC
 *
 * @returns Blog of the day or null
 */
export async function getBlogOfTheDay(): Promise<BlogPost | null> {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = FEATURED_CACHE_KEYS.BLOG_OF_THE_DAY(today);

  try {
    // Try cache first (cached until midnight)
    const cached = await cacheGet<BlogPost>(cacheKey);
    if (cached) {
      logger.debug('Blog of the day cache hit', { date: today });
      return cached;
    }

    // Calculate date thresholds
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    // Get yesterday's winner to exclude
    const yesterdayWinner = await cacheGet<BlogPost>(
      FEATURED_CACHE_KEYS.BLOG_OF_THE_DAY(yesterdayString)
    );

    // Fetch candidates
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        slug,
        subtitle,
        content_html,
        content_json,
        toc_data,
        author_id,
        cover_image:image_url,
        cover_image_alt,
        status,
        tags,
        category,
        reading_time_minutes,
        word_count,
        meta_title,
        meta_description,
        og_image,
        canonical_url,
        series_id,
        series_order,
        published_at,
        created_at,
        updated_at,
        view_count,
        clap_count,
        comment_count,
        trending_score,
        profiles:author_id (
          id,
          username,
          avatar_url,
          bio,
          follower_count
        )
      `)
      .eq('post_type', 'blog')
      .eq('status', 'published')
      .gte('published_at', thirtyDaysAgo.toISOString())
      .gte('view_count', 100);

    // Exclude yesterday's winner
    if (yesterdayWinner) {
      query = query.neq('id', yesterdayWinner.id);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      logger.error('Error fetching blog of the day candidates', error as Error);
      throw error;
    }

    if (!data || data.length === 0) {
      logger.warn('No eligible blogs for blog of the day');
      return null;
    }

    // Calculate daily score for each candidate
    interface ScoredBlog {
      post: Record<string, unknown>;
      score: number;
    }

    const scoredBlogs: ScoredBlog[] = data.map((post) => {
      const trendingScore = post.trending_score || 0;
      const viewCount = post.view_count || 0;
      const clapCount = post.clap_count || 0;
      const commentCount = post.comment_count || 0;

      // Weighted scoring
      const dailyScore =
        trendingScore * 0.4 +
        viewCount * 0.3 +
        clapCount * 0.2 +
        commentCount * 0.1;

      return { post, score: dailyScore };
    });

    // Sort by score descending
    scoredBlogs.sort((a, b) => b.score - a.score);

    // Get winner
    const winner = scoredBlogs[0].post;

    // Transform to BlogPost
    const blogOfTheDay: BlogPost = {
      id: winner.id as string,
      title: winner.title as string,
      slug: winner.slug as string,
      summary: winner.subtitle as string | undefined,
      content_json: (winner.content_json as JSONContent) || { type: 'doc', content: [] },
      content_html: (winner.content_html as string) || '',
      toc_data: (winner.toc_data || []) as TOCItem[],
      author_id: winner.author_id as string,
      author: Array.isArray(winner.profiles) && winner.profiles.length > 0
        ? {
            id: (winner.profiles[0] as { id: string }).id,
            username: (winner.profiles[0] as { username: string }).username,
            avatar_url: (winner.profiles[0] as { avatar_url?: string }).avatar_url,
            bio: (winner.profiles[0] as { bio?: string }).bio,
            follower_count: (winner.profiles[0] as { follower_count?: number }).follower_count,
          }
        : undefined,
      cover_image: winner.cover_image as string | undefined,
      cover_image_alt: winner.cover_image_alt as string | undefined,
      status: (winner.status as 'draft' | 'published' | 'scheduled') || 'published',
      tags: (winner.tags || []) as string[],
      category: winner.category as string | undefined,
      reading_time_minutes: (winner.reading_time_minutes || 0) as number,
      word_count: (winner.word_count || 0) as number,
      meta_title: winner.meta_title as string | undefined,
      meta_description: winner.meta_description as string | undefined,
      og_image: winner.og_image as string | undefined,
      canonical_url: winner.canonical_url as string | undefined,
      series_id: winner.series_id as string | undefined,
      series_order: winner.series_order as number | undefined,
      published_at: winner.published_at as string,
      created_at: winner.created_at as string,
      updated_at: winner.updated_at as string,
    };

    // Cache until midnight UTC
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const ttlSeconds = Math.floor((midnight.getTime() - now.getTime()) / 1000);

    await cacheSet(cacheKey, blogOfTheDay, ttlSeconds);

    logger.info('Blog of the day selected', {
      id: blogOfTheDay.id,
      title: blogOfTheDay.title,
      score: scoredBlogs[0].score,
    });

    return blogOfTheDay;
  } catch (error) {
    logger.error('Failed to get blog of the day', error as Error);
    return null;
  }
}

/**
 * Get latest published blogs
 *
 * @param limit Number of blogs to fetch (default: 6)
 * @returns Array of latest blog posts
 */
export async function getLatestBlogs(limit: number = 6): Promise<BlogPost[]> {
  const cacheKey = FEATURED_CACHE_KEYS.LATEST_BLOGS(limit);

  try {
    // Try cache first
    const cached = await cacheGet<BlogPost[]>(cacheKey);
    if (cached) {
      logger.debug('Latest blogs cache hit', { limit });
      return cached;
    }

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        slug,
        subtitle,
        content_html,
        content_json,
        toc_data,
        author_id,
        cover_image:image_url,
        cover_image_alt,
        status,
        tags,
        category,
        reading_time_minutes,
        word_count,
        meta_title,
        meta_description,
        og_image,
        canonical_url,
        series_id,
        series_order,
        published_at,
        created_at,
        updated_at,
        profiles:author_id (
          id,
          username,
          avatar_url,
          bio
        )
      `)
      .eq('post_type', 'blog')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching latest blogs', error as Error);
      throw error;
    }

    const blogs: BlogPost[] = (data || []).map((post) => ({
      id: post.id as string,
      title: post.title as string,
      slug: post.slug as string,
      summary: post.subtitle as string | undefined,
      content_json: (post.content_json as JSONContent) || { type: 'doc', content: [] },
      content_html: (post.content_html as string) || '',
      toc_data: (post.toc_data || []) as TOCItem[],
      author_id: post.author_id as string,
      author: Array.isArray(post.profiles) && post.profiles.length > 0
        ? {
            id: post.profiles[0].id,
            username: post.profiles[0].username,
            avatar_url: post.profiles[0].avatar_url,
            bio: post.profiles[0].bio,
          }
        : undefined,
      cover_image: post.cover_image as string | undefined,
      cover_image_alt: post.cover_image_alt as string | undefined,
      status: (post.status as 'draft' | 'published' | 'scheduled') || 'published',
      tags: (post.tags || []) as string[],
      category: post.category as string | undefined,
      reading_time_minutes: (post.reading_time_minutes || 0) as number,
      word_count: (post.word_count || 0) as number,
      meta_title: post.meta_title as string | undefined,
      meta_description: post.meta_description as string | undefined,
      og_image: post.og_image as string | undefined,
      canonical_url: post.canonical_url as string | undefined,
      series_id: post.series_id as string | undefined,
      series_order: post.series_order as number | undefined,
      published_at: post.published_at as string,
      created_at: post.created_at as string,
      updated_at: post.updated_at as string,
    }));

    // Cache for 5 minutes
    await cacheSet(cacheKey, blogs, CACHE_TTL.MEDIUM);

    return blogs;
  } catch (error) {
    logger.error('Failed to get latest blogs', error as Error);
    return [];
  }
}

/**
 * Get landing page statistics
 *
 * @returns Landing page stats
 */
export async function getLandingStats(): Promise<LandingStats> {
  const cacheKey = FEATURED_CACHE_KEYS.LANDING_STATS();

  try {
    // Try cache first
    const cached = await cacheGet<LandingStats>(cacheKey);
    if (cached) {
      logger.debug('Landing stats cache hit');
      return cached;
    }

    // Get total blogs
    const { count: totalBlogs } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('post_type', 'blog')
      .eq('status', 'published');

    // Get active writers (authors with at least one published blog)
    const { data: authors } = await supabase
      .from('posts')
      .select('author_id')
      .eq('post_type', 'blog')
      .eq('status', 'published');

    const uniqueAuthors = new Set(authors?.map((p) => p.author_id) || []);

    // Get total views (sum of all view_count)
    const { data: viewData } = await supabase
      .from('posts')
      .select('view_count')
      .eq('post_type', 'blog')
      .eq('status', 'published');

    const totalViews = viewData?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;

    // Get blogs published today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: blogsPublishedToday } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('post_type', 'blog')
      .eq('status', 'published')
      .gte('published_at', todayStart.toISOString());

    const stats: LandingStats = {
      totalBlogs: totalBlogs || 0,
      activeWriters: uniqueAuthors.size,
      totalViews,
      blogsPublishedToday: blogsPublishedToday || 0,
      timestamp: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, stats, CACHE_TTL.MEDIUM);

    logger.info('Landing stats fetched', { stats: stats as unknown as Record<string, unknown> });

    return stats;
  } catch (error) {
    logger.error('Failed to get landing stats', error as Error);
    // Return default stats on error
    return {
      totalBlogs: 0,
      activeWriters: 0,
      totalViews: 0,
      blogsPublishedToday: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Refresh featured content cache
 * Call this after publishing/unpublishing blogs
 */
export async function refreshFeaturedCache(): Promise<void> {
  try {
    await Promise.all([
      cacheDeletePattern('featured:*'),
      cacheDeletePattern('trending:*'),
    ]);

    logger.info('Featured content cache refreshed');
  } catch (error) {
    logger.error('Failed to refresh featured cache', error as Error);
  }
}

/**
 * Invalidate featured cache for a specific blog
 * Call this when a blog is edited/deleted
 */
export async function invalidateFeaturedBlog(blogId: string): Promise<void> {
  try {
    await cacheDeletePattern('featured:*');
    logger.info('Featured blog cache invalidated', { blogId });
  } catch (error) {
    logger.error('Failed to invalidate featured blog cache', error as Error, { blogId });
  }
}
