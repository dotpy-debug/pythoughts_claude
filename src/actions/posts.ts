import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

/**
 * Toggle the featured status of a post
 * Only admins and post authors can feature/unfeature posts
 */
export async function toggleFeaturedPost(
  postId: string,
  userId: string
): Promise<{ success: boolean; error?: string; featured?: boolean }> {
  try {
    // Get the post to check authorship
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id, featured')
      .eq('id', postId)
      .single();

    if (postError) {
      logger.error('Error fetching post for featured toggle', error as Error, { postError, postId });
      return { success: false, error: 'Post not found' };
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError) {
      logger.error('Error fetching user profile', error as Error, { profileError, userId });
      return { success: false, error: 'User not found' };
    }

    // Check permissions: must be admin or post author
    const isAdmin = profile?.is_admin === true;
    const isAuthor = post.author_id === userId;

    if (!isAdmin && !isAuthor) {
      logger.warn('Unauthorized featured toggle attempt', { userId, postId });
      return { success: false, error: 'Unauthorized: Only admins and authors can feature posts' };
    }

    // Toggle the featured status
    const newFeaturedStatus = !post.featured;

    const { error: updateError } = await supabase
      .from('posts')
      .update({ featured: newFeaturedStatus })
      .eq('id', postId);

    if (updateError) {
      logger.error('Error updating featured status', error as Error, { updateError, postId });
      return { success: false, error: 'Failed to update featured status' };
    }

    logger.info('Featured status toggled', { postId, featured: newFeaturedStatus, userId });

    return { success: true, featured: newFeaturedStatus };
  } catch (error) {
    logger.error('Unexpected error in toggleFeaturedPost', error as Error, { postId, userId });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get featured posts for the homepage or featured section
 */
export async function getFeaturedPosts(limit: number = 10) {
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
      .limit(limit);

    if (error) {
      logger.error('Error fetching featured posts', error as Error);
      return [];
    }

    return posts || [];
  } catch (error) {
    logger.error('Unexpected error in getFeaturedPosts', error as Error);
    return [];
  }
}
