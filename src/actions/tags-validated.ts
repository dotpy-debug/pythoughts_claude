/**
 * Tag Server Actions with Zod Validation
 *
 * This module provides validated server actions for tag operations.
 * All inputs are validated using Zod schemas before processing.
 *
 * @module actions/tags-validated
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { validateSchema } from '../lib/validation';
import {
  getPopularTagsSchema,
  getTrendingTagsSchema,
  getTagDetailsSchema,
  followTagSchema,
  unfollowTagSchema,
  getUserFollowedTagsSchema,
  searchTagsSchema,
} from '../schemas/tags';
import type { Tag } from '../lib/supabase';

export type TagWithStats = Tag & {
  is_following?: boolean;
  recent_posts_count?: number;
  top_authors?: Array<{
    id: string;
    username: string;
    avatar_url: string;
    post_count: number;
  }>;
};

/**
 * Get all active tags with stats
 */
export async function getPopularTags(limit: number = 50, userId?: string): Promise<TagWithStats[]> {
  // Validate input
  const validation = validateSchema(getPopularTagsSchema, { limit, userId });

  if (!validation.success) {
    logger.warn('Invalid input for getPopularTags', { errors: validation.errors });
    return [];
  }

  const { limit: validatedLimit, userId: validatedUserId } = validation.data;

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('post_count', { ascending: false })
      .order('follower_count', { ascending: false })
      .limit(validatedLimit);

    if (error) {
      logger.error('Error fetching popular tags', error as Error);
      return [];
    }

    if (!data) return [];

    // Get user's followed tags if userId provided
    let followedTagIds = new Set<string>();
    if (validatedUserId) {
      const { data: followData } = await supabase
        .from('tag_follows')
        .select('tag_id')
        .eq('user_id', validatedUserId);

      if (followData) {
        followedTagIds = new Set(followData.map(f => f.tag_id));
      }
    }

    // Enrich tags with following status
    const enrichedTags: TagWithStats[] = data.map(tag => ({
      ...tag,
      is_following: validatedUserId ? followedTagIds.has(tag.id) : false,
    }));

    return enrichedTags;
  } catch (error) {
    logger.error('Unexpected error in getPopularTags', error as Error);
    return [];
  }
}

/**
 * Get trending tags based on recent activity
 */
export async function getTrendingTags(limit: number = 10, days: number = 7): Promise<TagWithStats[]> {
  // Validate input
  const validation = validateSchema(getTrendingTagsSchema, { limit, days });

  if (!validation.success) {
    logger.warn('Invalid input for getTrendingTags', { errors: validation.errors });
    return [];
  }

  const { limit: validatedLimit, days: validatedDays } = validation.data;

  try {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - validatedDays);

    // Get tags with recent post activity
    const { data: recentPostTags, error } = await supabase
      .from('post_tags')
      .select(`
        tag_id,
        tags (
          id,
          name,
          slug,
          description,
          follower_count,
          post_count,
          created_at
        ),
        posts!inner (
          created_at,
          vote_count,
          comment_count
        )
      `)
      .gte('posts.created_at', dateFilter.toISOString())
      .eq('posts.is_published', true);

    if (error) {
      logger.error('Error fetching trending tags', error as Error);
      return [];
    }

    if (!recentPostTags) return [];

    // Aggregate tag activity
    const tagActivity = new Map<string, {
      tag: Tag;
      recent_posts_count: number;
      total_engagement: number;
    }>();

    for (const item of recentPostTags) {
      // Supabase returns arrays for joined relations
      const rawItem = item as {
        tag_id: string;
        tags: Array<{ id: string; name: string; slug: string; description: string | null; follower_count: number; post_count: number; created_at: string }>;
        posts: Array<{ created_at: string; vote_count: number; comment_count: number }>;
      };

      // Extract first element from arrays since we expect single relations
      const tag = rawItem.tags?.[0];
      const post = rawItem.posts?.[0];

      if (tag) {
        if (!tagActivity.has(tag.id)) {
          tagActivity.set(tag.id, {
            tag,
            recent_posts_count: 0,
            total_engagement: 0,
          });
        }

        const activity = tagActivity.get(tag.id)!;
        activity.recent_posts_count++;
        activity.total_engagement += (post?.vote_count || 0) + (post?.comment_count || 0);
      }
    }

    // Sort by engagement and recent activity
    const trendingTags = Array.from(tagActivity.values())
      .sort((a, b) => {
        const scoreA = a.recent_posts_count * 2 + a.total_engagement;
        const scoreB = b.recent_posts_count * 2 + b.total_engagement;
        return scoreB - scoreA;
      })
      .slice(0, validatedLimit)
      .map(activity => ({
        ...activity.tag,
        recent_posts_count: activity.recent_posts_count,
      }));

    return trendingTags;
  } catch (error) {
    logger.error('Unexpected error in getTrendingTags', error as Error);
    return [];
  }
}

/**
 * Get tag details with top authors
 */
export async function getTagDetails(tagSlug: string, userId?: string): Promise<TagWithStats | null> {
  // Validate input
  const validation = validateSchema(getTagDetailsSchema, { tagSlug, userId });

  if (!validation.success) {
    logger.warn('Invalid input for getTagDetails', { errors: validation.errors });
    return null;
  }

  const { tagSlug: validatedSlug, userId: validatedUserId } = validation.data;

  try {
    const { data: tag, error } = await supabase
      .from('tags')
      .select('*')
      .eq('slug', validatedSlug)
      .single();

    if (error || !tag) {
      logger.error('Error fetching tag details', error as Error, { tagSlug: validatedSlug });
      return null;
    }

    // Check if user is following
    let is_following = false;
    if (validatedUserId) {
      const { data: followData } = await supabase
        .from('tag_follows')
        .select('id')
        .eq('user_id', validatedUserId)
        .eq('tag_id', tag.id)
        .single();

      is_following = !!followData;
    }

    // Get top authors for this tag
    const { data: postTagsData } = await supabase
      .from('post_tags')
      .select(`
        posts!inner (
          author_id,
          profiles:author_id (
            id,
            username,
            avatar_url
          )
        )
      `)
      .eq('tag_id', tag.id)
      .eq('posts.is_published', true);

    const authorCounts = new Map<string, {
      id: string;
      username: string;
      avatar_url: string;
      post_count: number;
    }>();

    if (postTagsData) {
      for (const item of postTagsData) {
        // Supabase returns arrays for joined relations
        const rawItem = item as {
          posts: Array<{
            author_id: string;
            profiles: Array<{
              id: string;
              username: string;
              avatar_url: string | null;
            }>;
          }>;
        };

        const post = rawItem.posts?.[0];
        const profile = post?.profiles?.[0];

        if (post && profile) {
          const existing = authorCounts.get(profile.id);
          if (existing) {
            existing.post_count++;
          } else {
            authorCounts.set(profile.id, {
              id: profile.id,
              username: profile.username,
              avatar_url: profile.avatar_url || '',
              post_count: 1,
            });
          }
        }
      }
    }

    const top_authors = Array.from(authorCounts.values())
      .sort((a, b) => b.post_count - a.post_count)
      .slice(0, 10);

    return {
      ...tag,
      is_following,
      top_authors,
    };
  } catch (error) {
    logger.error('Unexpected error in getTagDetails', error as Error, { tagSlug: validatedSlug });
    return null;
  }
}

/**
 * Follow a tag
 */
export async function followTag(tagId: string, userId: string): Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }> {
  // Validate input
  const validation = validateSchema(followTagSchema, { tagId, userId });

  if (!validation.success) {
    logger.warn('Invalid input for followTag', { errors: validation.errors });
    return { success: false, error: 'Invalid input', errors: validation.errors };
  }

  const { tagId: validatedTagId, userId: validatedUserId } = validation.data;

  try {
    const { error } = await supabase
      .from('tag_follows')
      .insert({ user_id: validatedUserId, tag_id: validatedTagId });

    if (error) {
      if (error.code === '23505') {
        // Already following
        return { success: true };
      }
      logger.error('Error following tag', error as Error, { tagId: validatedTagId, userId: validatedUserId });
      return { success: false, error: 'Failed to follow tag' };
    }

    // Increment follower count
    await supabase.rpc('increment_tag_followers', { tag_id: validatedTagId });

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in followTag', error as Error, { tagId: validatedTagId, userId: validatedUserId });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Unfollow a tag
 */
export async function unfollowTag(tagId: string, userId: string): Promise<{ success: boolean; error?: string; errors?: Record<string, string[]> }> {
  // Validate input
  const validation = validateSchema(unfollowTagSchema, { tagId, userId });

  if (!validation.success) {
    logger.warn('Invalid input for unfollowTag', { errors: validation.errors });
    return { success: false, error: 'Invalid input', errors: validation.errors };
  }

  const { tagId: validatedTagId, userId: validatedUserId } = validation.data;

  try {
    const { error } = await supabase
      .from('tag_follows')
      .delete()
      .eq('user_id', validatedUserId)
      .eq('tag_id', validatedTagId);

    if (error) {
      logger.error('Error unfollowing tag', error as Error, { tagId: validatedTagId, userId: validatedUserId });
      return { success: false, error: 'Failed to unfollow tag' };
    }

    // Decrement follower count
    await supabase.rpc('decrement_tag_followers', { tag_id: validatedTagId });

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in unfollowTag', error as Error, { tagId: validatedTagId, userId: validatedUserId });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get user's followed tags
 */
export async function getUserFollowedTags(userId: string): Promise<Tag[]> {
  // Validate input
  const validation = validateSchema(getUserFollowedTagsSchema, { userId });

  if (!validation.success) {
    logger.warn('Invalid input for getUserFollowedTags', { errors: validation.errors });
    return [];
  }

  const { userId: validatedUserId } = validation.data;

  try {
    const { data, error } = await supabase
      .from('tag_follows')
      .select(`
        tags (
          id,
          name,
          slug,
          description,
          follower_count,
          post_count,
          created_at
        )
      `)
      .eq('user_id', validatedUserId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching user followed tags', error as Error, { userId: validatedUserId });
      return [];
    }

    if (!data) return [];

    // Supabase returns arrays for joined relations
    return data
      .map((item: { tags: Array<Tag> | null }) => item.tags?.[0] || null)
      .filter((tag): tag is Tag => tag !== null);
  } catch (error) {
    logger.error('Unexpected error in getUserFollowedTags', error as Error, { userId: validatedUserId });
    return [];
  }
}

/**
 * Search tags by name
 */
export async function searchTags(query: string, limit: number = 20): Promise<Tag[]> {
  // Validate input
  const validation = validateSchema(searchTagsSchema, { query, limit });

  if (!validation.success) {
    logger.warn('Invalid input for searchTags', { errors: validation.errors });
    return [];
  }

  const { query: validatedQuery, limit: validatedLimit } = validation.data;

  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .ilike('name', `%${validatedQuery}%`)
      .order('post_count', { ascending: false })
      .limit(validatedLimit);

    if (error) {
      logger.error('Error searching tags', error as Error, { query: validatedQuery });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in searchTags', error as Error, { query: validatedQuery });
    return [];
  }
}
