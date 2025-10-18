import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { PostVersion } from '../lib/supabase';

/**
 * Get all versions for a specific post
 */
export async function getPostVersions(postId: string): Promise<PostVersion[]> {
  try {
    const { data, error } = await supabase
      .from('post_versions')
      .select(`
        *,
        profiles!post_versions_changed_by_fkey (
          id,
          username,
          display_username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('version_number', { ascending: false });

    if (error) {
      logger.error('Error fetching post versions', { error, postId });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getPostVersions', { error, postId });
    return [];
  }
}

/**
 * Get a specific version of a post
 */
export async function getPostVersion(
  postId: string,
  versionNumber: number
): Promise<PostVersion | null> {
  try {
    const { data, error } = await supabase
      .from('post_versions')
      .select(`
        *,
        profiles!post_versions_changed_by_fkey (
          id,
          username,
          display_username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .eq('version_number', versionNumber)
      .single();

    if (error) {
      logger.error('Error fetching post version', { error, postId, versionNumber });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Unexpected error in getPostVersion', { error, postId, versionNumber });
    return null;
  }
}

/**
 * Get the total version count for a post
 */
export async function getPostVersionCount(postId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('post_versions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      logger.error('Error counting post versions', { error, postId });
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Unexpected error in getPostVersionCount', { error, postId });
    return 0;
  }
}

/**
 * Restore a specific version of a post
 * Only the post author can restore versions
 */
export async function restorePostVersion(
  postId: string,
  versionNumber: number,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is the post author
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      logger.error('Error fetching post for version restore', { error: postError, postId });
      return { success: false, error: 'Post not found' };
    }

    if (post.author_id !== userId) {
      logger.warn('Unauthorized version restore attempt', { userId, postId });
      return { success: false, error: 'Unauthorized: Only the post author can restore versions' };
    }

    // Get the version to restore
    const { data: version, error: versionError } = await supabase
      .from('post_versions')
      .select('*')
      .eq('post_id', postId)
      .eq('version_number', versionNumber)
      .single();

    if (versionError || !version) {
      logger.error('Error fetching version for restore', { error: versionError, postId, versionNumber });
      return { success: false, error: 'Version not found' };
    }

    // Update the post with the version data
    // This will automatically create a new version of the current state via trigger
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        title: version.title,
        content: version.content,
        subtitle: version.subtitle,
        image_url: version.image_url,
        category: version.category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (updateError) {
      logger.error('Error restoring post version', { error: updateError, postId, versionNumber });
      return { success: false, error: 'Failed to restore version' };
    }

    logger.info('Post version restored successfully', { postId, versionNumber, userId });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in restorePostVersion', { error, postId, versionNumber });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Compare two versions and get the differences
 * Returns a summary of what changed between versions
 */
export async function comparePostVersions(
  postId: string,
  version1: number,
  version2: number
): Promise<{
  success: boolean;
  changes?: {
    title?: { old: string; new: string };
    content?: { old: string; new: string; lengthDiff: number };
    subtitle?: { old: string; new: string };
    image_url?: { old: string; new: string };
    category?: { old: string; new: string };
  };
  error?: string;
}> {
  try {
    // Fetch both versions
    const { data: versions, error } = await supabase
      .from('post_versions')
      .select('*')
      .eq('post_id', postId)
      .in('version_number', [version1, version2])
      .order('version_number', { ascending: true });

    if (error || !versions || versions.length !== 2) {
      logger.error('Error fetching versions for comparison', { error, postId, version1, version2 });
      return { success: false, error: 'Could not fetch versions for comparison' };
    }

    const [oldVersion, newVersion] = versions;
    const changes: any = {};

    // Compare fields
    if (oldVersion.title !== newVersion.title) {
      changes.title = { old: oldVersion.title, new: newVersion.title };
    }

    if (oldVersion.content !== newVersion.content) {
      changes.content = {
        old: oldVersion.content,
        new: newVersion.content,
        lengthDiff: newVersion.content.length - oldVersion.content.length,
      };
    }

    if (oldVersion.subtitle !== newVersion.subtitle) {
      changes.subtitle = { old: oldVersion.subtitle, new: newVersion.subtitle };
    }

    if (oldVersion.image_url !== newVersion.image_url) {
      changes.image_url = { old: oldVersion.image_url, new: newVersion.image_url };
    }

    if (oldVersion.category !== newVersion.category) {
      changes.category = { old: oldVersion.category, new: newVersion.category };
    }

    return { success: true, changes };
  } catch (error) {
    logger.error('Unexpected error in comparePostVersions', { error, postId });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Add a change description to a version
 * Useful for documenting what changed in a specific version
 */
export async function addVersionDescription(
  versionId: string,
  description: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the user is the post author
    const { data: version, error: versionError } = await supabase
      .from('post_versions')
      .select(`
        post_id,
        posts!inner (author_id)
      `)
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      return { success: false, error: 'Version not found' };
    }

    const post = version.posts as any;
    if (post.author_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error: updateError } = await supabase
      .from('post_versions')
      .update({ change_description: description })
      .eq('id', versionId);

    if (updateError) {
      logger.error('Error adding version description', { error: updateError, versionId });
      return { success: false, error: 'Failed to add description' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in addVersionDescription', { error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
