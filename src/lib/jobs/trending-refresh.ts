/**
 * Background Job: Trending Posts Refresh
 *
 * This script refreshes the trending_posts_view materialized view
 * to ensure trending posts are always up-to-date.
 *
 * DEPLOYMENT:
 * - Run this job every 5 minutes using a cron job or task scheduler
 * - Can be triggered via BullMQ queue for distributed systems
 * - Supports graceful shutdown and error handling
 *
 * USAGE:
 * - Node.js: node trending-refresh.js
 * - Cron: (star)/5 * * * * node /path/to/trending-refresh.js (replace (star) with *)
 * - BullMQ: Add to trending-queue with repeat pattern
 */

import { supabase } from '../supabase';
import { invalidateTrendingCache, batchUpdateTrendingScores } from '../trending';
import { logger } from '../logger';

/**
 * Refresh trending posts materialized view and invalidate cache
 */
export async function refreshTrendingPosts(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Starting trending posts refresh');

    // Step 1: Refresh materialized view concurrently (non-blocking)
    const { error: refreshError } = await supabase.rpc('refresh_trending_posts');

    if (refreshError) {
      logger.error('Error refreshing trending materialized view', {
        error: refreshError.message || 'Unknown error',
        code: refreshError.code,
        details: refreshError.details,
      });
      throw refreshError;
    }

    logger.info('Trending materialized view refreshed successfully');

    // Step 2: Invalidate all trending caches
    await invalidateTrendingCache();

    logger.info('Trending cache invalidated successfully');

    // Step 3: Update trending scores for recently active posts
    // This ensures real-time updates for posts with recent activity
    const { data: recentPosts, error: recentError } = await supabase
      .from('posts')
      .select('id')
      .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .eq('is_published', true);

    if (recentError) {
      logger.error('Error fetching recent posts for trending update', {
        error: recentError.message || 'Unknown error',
        code: recentError.code,
      });
    } else if (recentPosts && recentPosts.length > 0) {
      const postIds = recentPosts.map((p) => p.id);
      await batchUpdateTrendingScores(postIds);
      logger.info('Updated trending scores for recently active posts', {
        postsUpdated: postIds.length,
      });
    }

    const duration = Date.now() - startTime;
    logger.info('Trending posts refresh completed successfully', {
      durationMs: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Trending posts refresh failed', {
      durationMs: duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get trending refresh job status and statistics
 */
export async function getTrendingRefreshStats(): Promise<{
  lastRefresh: Date | null;
  totalPosts: number;
  avgScore: number;
}> {
  try {
    // Query materialized view metadata
    const { data, error } = await supabase.rpc('get_trending_stats');

    if (error) {
      logger.error('Error getting trending refresh stats', {
        error: error.message || 'Unknown error',
        code: error.code,
      });
      return {
        lastRefresh: null,
        totalPosts: 0,
        avgScore: 0,
      };
    }

    return {
      lastRefresh: new Date(),
      totalPosts: data?.total_trending_posts || 0,
      avgScore: data?.average_score || 0,
    };
  } catch (error) {
    logger.error('Unexpected error getting trending refresh stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      lastRefresh: null,
      totalPosts: 0,
      avgScore: 0,
    };
  }
}

/**
 * Main execution for standalone script
 * Note: This check doesn't work in ESM modules. Use a separate entry point for CLI usage.
 */
// if (require.main === module) {
//   refreshTrendingPosts()
//     .then(() => {
//       console.log('[Trending Refresh] Job completed successfully');
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error('[Trending Refresh] Job failed:', error);
//       process.exit(1);
//     });
// }
