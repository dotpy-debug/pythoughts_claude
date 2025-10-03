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

/**
 * Refresh trending posts materialized view and invalidate cache
 */
export async function refreshTrendingPosts(): Promise<void> {
  const startTime = Date.now();

  try {
    console.log('[Trending Refresh] Starting trending posts refresh...');

    // Step 1: Refresh materialized view concurrently (non-blocking)
    const { error: refreshError } = await supabase.rpc('refresh_trending_posts');

    if (refreshError) {
      console.error('[Trending Refresh] Error refreshing materialized view:', refreshError);
      throw refreshError;
    }

    console.log('[Trending Refresh] Materialized view refreshed successfully');

    // Step 2: Invalidate all trending caches
    await invalidateTrendingCache();

    console.log('[Trending Refresh] Cache invalidated successfully');

    // Step 3: Update trending scores for recently active posts
    // This ensures real-time updates for posts with recent activity
    const { data: recentPosts, error: recentError } = await supabase
      .from('posts')
      .select('id')
      .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .eq('is_published', true);

    if (recentError) {
      console.error('[Trending Refresh] Error fetching recent posts:', recentError);
    } else if (recentPosts && recentPosts.length > 0) {
      const postIds = recentPosts.map((p) => p.id);
      await batchUpdateTrendingScores(postIds);
      console.log(`[Trending Refresh] Updated scores for ${postIds.length} recently active posts`);
    }

    const duration = Date.now() - startTime;
    console.log(`[Trending Refresh] Completed successfully in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Trending Refresh] Failed after ${duration}ms:`, error);
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
      console.error('[Trending Refresh] Error getting stats:', error);
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
    console.error('[Trending Refresh] Error getting stats:', error);
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
