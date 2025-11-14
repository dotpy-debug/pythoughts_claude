/**
 * Post Server Actions with Zod Validation
 *
 * This module provides validated server actions for post operations.
 * All inputs are validated using Zod schemas before processing.
 *
 * @module actions/posts-validated
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { validateSchema } from '../lib/validation';
import { toggleFeaturedPostSchema, getFeaturedPostsSchema } from '../schemas/posts';

/**
 * Toggle the featured status of a post
 * Only admins and post authors can feature/unfeature posts
 */
export async function toggleFeaturedPost(
  postId: string,
  userId: string
): Promise<{ success: boolean; error?: string; featured?: boolean; errors?: Record<string, string[]> }> {
  // Validate input
  const validation = validateSchema(toggleFeaturedPostSchema, { postId, userId });

  if (!validation.success) {
    logger.warn('Invalid input for toggleFeaturedPost', { errors: validation.errors });
    return { success: false, error: 'Invalid input', errors: validation.errors };
  }

  const { postId: validatedPostId, userId: validatedUserId } = validation.data;

  try {
    // Get the post to check authorship
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id, featured')
      .eq('id', validatedPostId)
      .single();

    if (postError) {
      logger.error('Error fetching post for featured toggle', { postError: postError.message, postId: validatedPostId });
      return { success: false, error: 'Post not found' };
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', validatedUserId)
      .single();

    if (profileError) {
      logger.error('Error fetching user profile', { profileError: profileError.message, userId: validatedUserId });
      return { success: false, error: 'User not found' };
    }

    // Check permissions: must be admin or post author
    const isAdmin = profile?.is_admin === true;
    const isAuthor = post.author_id === validatedUserId;

    if (!isAdmin && !isAuthor) {
      logger.warn('Unauthorized featured toggle attempt', { userId: validatedUserId, postId: validatedPostId });
      return { success: false, error: 'Unauthorized: Only admins and authors can feature posts' };
    }

    // Toggle the featured status
    const newFeaturedStatus = !post.featured;

    const { error: updateError } = await supabase
      .from('posts')
      .update({ featured: newFeaturedStatus })
      .eq('id', validatedPostId);

    if (updateError) {
      logger.error('Error updating featured status', { updateError: updateError.message, postId: validatedPostId });
      return { success: false, error: 'Failed to update featured status' };
    }

    logger.info('Featured status toggled', { postId: validatedPostId, featured: newFeaturedStatus, userId: validatedUserId });

    return { success: true, featured: newFeaturedStatus };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Unexpected error in toggleFeaturedPost', { errorMessage, postId: validatedPostId, userId: validatedUserId });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get featured posts for the homepage or featured section
 */
export async function getFeaturedPosts(limit: number = 10) {
  // Validate input
  const validation = validateSchema(getFeaturedPostsSchema, { limit });

  if (!validation.success) {
    logger.warn('Invalid input for getFeaturedPosts', { errors: validation.errors });
    return [];
  }

  const { limit: validatedLimit } = validation.data;

  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey (
          id,
          username,
          display_username,
          avatar_url,
          is_verified
        ),
        post_stats (
          view_count,
          clap_count,
          bookmark_count,
          engagement_score
        )
      `)
      .eq('featured', true)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(validatedLimit);

    if (error) {
      logger.error('Error fetching featured posts', { errorMessage: error.message });
      return [];
    }

    return posts || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Unexpected error in getFeaturedPosts', { errorMessage });
    return [];
  }
}
