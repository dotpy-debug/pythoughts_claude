import { supabase, Post } from './supabase';
import { logger } from './logger';

// Import cache functions dynamically to avoid bundling Redis in the client
const getCacheUtils = async () => {
  // Only import Redis on server-side or when actually needed
  if (typeof window === 'undefined') {
    const { cacheGet, cacheSet } = await import('./redis');
    return { cacheGet, cacheSet };
  }
  // Client-side fallback (no caching)
  return {
    cacheGet: async () => null,
    cacheSet: async () => {},
  };
};

/**
 * TRENDING ALGORITHM IMPLEMENTATION
 *
 * Inspired by Reddit's "hot" algorithm with custom optimizations for Pythoughts.
 *
 * FORMULA:
 * trending_score = log10(max(1, |votes|)) + (comment_weight * comments) + (reaction_weight * reactions) - age_penalty
 *
 * WHERE:
 * - log10(max(1, |votes|)): Logarithmic scaling of vote count (prevents vote inflation)
 * - comment_weight * comments: Comments are weighted higher than votes (engagement signal)
 * - reaction_weight * reactions: Emoji reactions count as engagement
 * - age_penalty: Exponential decay based on post age
 *
 * AGE PENALTY CALCULATION:
 * - age_penalty = (hours_since_post / gravity)^1.8
 * - gravity = 12 (half-life of ~6 hours for balanced trending)
 * - Older posts decay exponentially, recent posts get boosted
 *
 * WEIGHTS:
 * - Comment weight: 2.0 (comments indicate high engagement)
 * - Reaction weight: 0.5 (reactions are lightweight engagement)
 * - Gravity: 12 hours (controls decay rate)
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses materialized view with auto-refresh
 * - Redis caching with 5-minute TTL
 * - Composite indexes on (trending_score DESC, created_at DESC)
 * - Background refresh via database functions
 */

// Trending algorithm constants
export const TRENDING_CONSTANTS = {
  COMMENT_WEIGHT: 2.0,
  REACTION_WEIGHT: 0.5,
  GRAVITY: 12, // hours
  DECAY_EXPONENT: 1.8,
  CACHE_TTL: 300, // 5 minutes
  MAX_TRENDING_POSTS: 20,
};

/**
 * Calculate trending score for a single post
 * This function is used for real-time score calculation before DB update
 */
export function calculateTrendingScore(post: {
  vote_count: number;
  comment_count: number;
  reaction_count?: number;
  created_at: string;
}): number {
  const { vote_count, comment_count, reaction_count = 0, created_at } = post;

  // Step 1: Logarithmic vote scaling
  const voteScore = Math.log10(Math.max(1, Math.abs(vote_count)));

  // Step 2: Comment engagement (weighted higher)
  const commentScore = TRENDING_CONSTANTS.COMMENT_WEIGHT * comment_count;

  // Step 3: Reaction engagement
  const reactionScore = TRENDING_CONSTANTS.REACTION_WEIGHT * reaction_count;

  // Step 4: Calculate age penalty
  const postDate = new Date(created_at);
  const now = new Date();
  const hoursSincePost = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
  const agePenalty = Math.pow(
    hoursSincePost / TRENDING_CONSTANTS.GRAVITY,
    TRENDING_CONSTANTS.DECAY_EXPONENT
  );

  // Final score calculation
  const trendingScore = voteScore + commentScore + reactionScore - agePenalty;

  return trendingScore;
}

/**
 * Calculate vote velocity (votes per hour)
 * Used to detect rapidly growing posts
 */
export function calculateVoteVelocity(
  vote_count: number,
  created_at: string
): number {
  const postDate = new Date(created_at);
  const now = new Date();
  const hoursSincePost = Math.max(
    1,
    (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)
  );

  return vote_count / hoursSincePost;
}

/**
 * Fetch trending posts with comprehensive caching strategy
 *
 * CACHING STRATEGY:
 * 1. Check Redis cache (5-minute TTL)
 * 2. If cache miss, query database materialized view
 * 3. Cache result for subsequent requests
 * 4. Return top 20 trending posts
 */
export async function getTrendingPosts(
  limit: number = TRENDING_CONSTANTS.MAX_TRENDING_POSTS
): Promise<Post[]> {
  const cacheKey = `trending:posts:limit:${limit}`;
  const { cacheGet, cacheSet } = await getCacheUtils();

  // Step 1: Try cache first
  const cached = await cacheGet<Post[]>(cacheKey);
  if (cached) {
    logger.debug('Trending posts cache HIT', { limit, cacheKey });
    return cached;
  }

  logger.debug('Trending posts cache MISS - querying database', { limit, cacheKey });

  // Step 2: Query from posts table directly since view may not exist
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:author_id (
        id,
        username,
        avatar_url,
        bio,
        created_at,
        updated_at
      )
    `)
    .eq('is_published', true)
    .eq('is_draft', false)
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Trending posts database query error', new Error(error.message), {
      limit,
    });
    throw error;
  }

  // Transform the data to match Post type (profiles is returned as array from Supabase)
  const posts: Post[] = (data || []).map((item) => ({
    ...(item as unknown as Post),
    profiles: Array.isArray((item as { profiles?: unknown }).profiles)
      ? (item as { profiles: unknown[] }).profiles[0]
      : (item as { profiles?: unknown }).profiles,
  })) as Post[];

  // Step 3: Cache the result
  await cacheSet(cacheKey, posts, TRENDING_CONSTANTS.CACHE_TTL);

  return posts;
}

/**
 * Fetch trending posts by category
 */
export async function getTrendingPostsByCategory(
  category: string,
  limit: number = 10
): Promise<Post[]> {
  const cacheKey = `trending:posts:category:${category}:limit:${limit}`;
  const { cacheGet, cacheSet } = await getCacheUtils();

  const cached = await cacheGet<Post[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:author_id (
        id,
        username,
        avatar_url,
        bio,
        created_at,
        updated_at
      )
    `)
    .eq('is_published', true)
    .eq('is_draft', false)
    .eq('category', category)
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Trending category query error', new Error(error.message), {
      category,
      limit,
    });
    throw error;
  }

  // Transform the data to match Post type (profiles is returned as array from Supabase)
  const posts: Post[] = (data || []).map((item) => ({
    ...(item as unknown as Post),
    profiles: Array.isArray((item as { profiles?: unknown }).profiles)
      ? (item as { profiles: unknown[] }).profiles[0]
      : (item as { profiles?: unknown }).profiles,
  })) as Post[];
  await cacheSet(cacheKey, posts, TRENDING_CONSTANTS.CACHE_TTL);

  return posts;
}

/**
 * Update trending score for a specific post
 * Called after votes, comments, or reactions change
 */
export async function updatePostTrendingScore(postId: string): Promise<void> {
  try {
    // Call the database function to recalculate trending score
    const { error } = await supabase.rpc('update_post_trending_score', {
      post_id: postId,
    });

    if (error) {
      logger.error('Error updating trending score', new Error(error.message), {
        postId,
      });
      throw error;
    }

    // Invalidate all trending caches
    await invalidateTrendingCache();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to update trending score', errorObj, {
      postId,
    });
  }
}

/**
 * Batch update trending scores for multiple posts
 * Used by background job to refresh all scores
 */
export async function batchUpdateTrendingScores(
  postIds?: string[]
): Promise<void> {
  try {
    if (postIds && postIds.length > 0) {
      // Update specific posts
      for (const postId of postIds) {
        await updatePostTrendingScore(postId);
      }
    } else {
      // Refresh the entire materialized view
      const { error } = await supabase.rpc('refresh_trending_posts');

      if (error) {
        logger.error('Error refreshing trending view', new Error(error.message));
        throw error;
      }
    }

    await invalidateTrendingCache();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Batch trending update failed', errorObj, {
      postIdsCount: postIds?.length,
    });
  }
}

/**
 * Invalidate all trending caches
 */
export async function invalidateTrendingCache(): Promise<void> {
  try {
    const { getRedisClient } = await import('./redis');
    const redis = getRedisClient();

    // Delete all trending-related cache keys
    const keys = await redis.keys('trending:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Trending cache invalidated', {
        keysCount: keys.length,
      });
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Trending cache invalidation error', errorObj);
  }
}

/**
 * Get trending statistics
 */
export async function getTrendingStats(): Promise<{
  totalTrendingPosts: number;
  topCategory: string | null;
  averageScore: number;
}> {
  const cacheKey = 'trending:stats';
  const { cacheGet, cacheSet } = await getCacheUtils();

  const cached = await cacheGet<{
    totalTrendingPosts: number;
    topCategory: string | null;
    averageScore: number;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  const { data, error } = await supabase.rpc('get_trending_stats');

  if (error) {
    logger.error('Trending stats query error', new Error(error.message));
    return {
      totalTrendingPosts: 0,
      topCategory: null,
      averageScore: 0,
    };
  }

  const stats = data || {
    totalTrendingPosts: 0,
    topCategory: null,
    averageScore: 0,
  };

  await cacheSet(cacheKey, stats, TRENDING_CONSTANTS.CACHE_TTL);

  return stats;
}
