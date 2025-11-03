/**
 * Content Moderation Server Actions
 *
 * Server actions for content moderation:
 * - Content reports management
 * - Post/comment moderation
 * - Bulk actions
 * - Content quarantine
 */

import { supabase, type Post, type Comment, type ContentReport } from '../lib/supabase';
import { requireRole, logAdminActivity, ADMIN_ROLES } from '../lib/admin-auth';
import { logger } from '../lib/logger';

/**
 * Get content reports with filters
 */
export async function getContentReports(parameters: {
  currentUserId: string;
  status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reportType?: string;
  page?: number;
  limit?: number;
}): Promise<{ reports: ContentReport[]; total: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.MODERATOR);

    const page = parameters.page ?? 1;
    const limit = parameters.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('content_reports')
      .select(
        `
        *,
        reporter_profile:reporter_id (id, username, avatar_url),
        reported_user_profile:reported_user_id (id, username, avatar_url),
        assigned_admin_profile:assigned_to (id, username, avatar_url),
        posts:post_id (id, title, content, author_id),
        comments:comment_id (id, content, author_id)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (parameters.status) {
      query = query.eq('status', parameters.status);
    }

    if (parameters.reportType) {
      query = query.eq('report_type', parameters.reportType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching content reports', { errorDetails: error });
      return { reports: [], total: 0, error: 'Failed to fetch reports' };
    }

    return {
      reports: (data as ContentReport[]) ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in getContentReports', { errorDetails: error });
    return {
      reports: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch reports',
    };
  }
}

/**
 * Update report status
 */
export async function updateReportStatus(parameters: {
  currentUserId: string;
  reportId: string;
  status: 'reviewing' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.MODERATOR);

    const updates: {
      status: string;
      assigned_to: string;
      updated_at: string;
      resolution_notes?: string;
      resolved_at?: string;
    } = {
      status: parameters.status,
      assigned_to: parameters.currentUserId,
      updated_at: new Date().toISOString(),
    };

    if (parameters.resolutionNotes) {
      updates.resolution_notes = parameters.resolutionNotes;
    }

    if (parameters.status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('content_reports')
      .update(updates)
      .eq('id', parameters.reportId);

    if (error) {
      logger.error('Error updating report status', { errorDetails: error });
      return { success: false, error: 'Failed to update report' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'update_report_status',
      targetType: 'report',
      targetId: parameters.reportId,
      details: { status: parameters.status },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateReportStatus', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update report',
    };
  }
}

/**
 * Get posts for moderation
 */
export async function getPostsForModeration(parameters: {
  currentUserId: string;
  filter?: 'all' | 'flagged' | 'drafts' | 'published';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ posts: Post[]; total: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.MODERATOR);

    const page = parameters.page ?? 1;
    const limit = parameters.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('posts')
      .select(
        `
        *,
        profiles:author_id (id, username, avatar_url),
        post_stats (*)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (parameters.filter === 'drafts') {
      query = query.eq('is_draft', true);
    } else if (parameters.filter === 'published') {
      query = query.eq('is_published', true);
    }

    if (parameters.search) {
      query = query.or(`title.ilike.%${parameters.search}%,content.ilike.%${parameters.search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching posts for moderation', { errorDetails: error });
      return { posts: [], total: 0, error: 'Failed to fetch posts' };
    }

    return {
      posts: (data as Post[]) ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in getPostsForModeration', { errorDetails: error });
    return {
      posts: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch posts',
    };
  }
}

/**
 * Delete post (moderator action)
 */
export async function deletePost(parameters: {
  currentUserId: string;
  postId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.MODERATOR);

    const { error } = await supabase.from('posts').delete().eq('id', parameters.postId);

    if (error) {
      logger.error('Error deleting post', { errorDetails: error });
      return { success: false, error: 'Failed to delete post' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'delete_post',
      targetType: 'post',
      targetId: parameters.postId,
      details: { reason: parameters.reason },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in deletePost', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post',
    };
  }
}

/**
 * Update post (moderator edit)
 */
export async function moderatePost(parameters: {
  currentUserId: string;
  postId: string;
  updates: {
    title?: string;
    content?: string;
    is_published?: boolean;
    featured?: boolean;
  };
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { error } = await supabase
      .from('posts')
      .update({
        ...parameters.updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parameters.postId);

    if (error) {
      logger.error('Error moderating post', { errorDetails: error });
      return { success: false, error: 'Failed to moderate post' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'moderate_post',
      targetType: 'post',
      targetId: parameters.postId,
      details: { updates: parameters.updates, reason: parameters.reason },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in moderatePost', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to moderate post',
    };
  }
}

/**
 * Feature/unfeature post
 */
export async function toggleFeaturedPost(parameters: {
  currentUserId: string;
  postId: string;
  featured: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.EDITOR);

    const { error } = await supabase
      .from('posts')
      .update({ featured: parameters.featured })
      .eq('id', parameters.postId);

    if (error) {
      logger.error('Error toggling featured status', { errorDetails: error });
      return { success: false, error: 'Failed to update post' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: parameters.featured ? 'feature_post' : 'unfeature_post',
      targetType: 'post',
      targetId: parameters.postId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in toggleFeaturedPost', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update post',
    };
  }
}

/**
 * Get comments for moderation
 */
export async function getCommentsForModeration(parameters: {
  currentUserId: string;
  postId?: string;
  flagged?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ comments: Comment[]; total: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.MODERATOR);

    const page = parameters.page ?? 1;
    const limit = parameters.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('comments')
      .select(
        `
        *,
        profiles:author_id (id, username, avatar_url)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (parameters.postId) {
      query = query.eq('post_id', parameters.postId);
    }

    if (parameters.flagged !== undefined) {
      // This would require a flagged column in comments table
      // For now, we'll just filter deleted comments
      query = query.eq('is_deleted', false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching comments for moderation', { errorDetails: error });
      return { comments: [], total: 0, error: 'Failed to fetch comments' };
    }

    return {
      comments: (data as Comment[]) ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in getCommentsForModeration', { errorDetails: error });
    return {
      comments: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch comments',
    };
  }
}

/**
 * Delete comment (moderator action)
 */
export async function deleteComment(parameters: {
  currentUserId: string;
  commentId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.MODERATOR);

    // Soft delete
    const { error } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        content: '[deleted by moderator]',
        updated_at: new Date().toISOString(),
      })
      .eq('id', parameters.commentId);

    if (error) {
      logger.error('Error deleting comment', { errorDetails: error });
      return { success: false, error: 'Failed to delete comment' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'delete_comment',
      targetType: 'comment',
      targetId: parameters.commentId,
      details: { reason: parameters.reason },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in deleteComment', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment',
    };
  }
}

/**
 * Bulk delete posts
 */
export async function bulkDeletePosts(parameters: {
  currentUserId: string;
  postIds: string[];
  reason: string;
}): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.MODERATOR);

    const { error, count } = await supabase
      .from('posts')
      .delete()
      .in('id', parameters.postIds);

    if (error) {
      logger.error('Error bulk deleting posts', { errorDetails: error });
      return { success: false, deleted: 0, error: 'Failed to delete posts' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'bulk_delete_posts',
      targetType: 'post',
      details: { count: parameters.postIds.length, reason: parameters.reason },
    });

    return { success: true, deleted: count ?? 0 };
  } catch (error) {
    logger.error('Exception in bulkDeletePosts', { errorDetails: error });
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Failed to delete posts',
    };
  }
}

/**
 * Bulk delete comments
 */
export async function bulkDeleteComments(parameters: {
  currentUserId: string;
  commentIds: string[];
  reason: string;
}): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.MODERATOR);

    const { error, count } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        content: '[deleted by moderator]',
        updated_at: new Date().toISOString(),
      })
      .in('id', parameters.commentIds);

    if (error) {
      logger.error('Error bulk deleting comments', { errorDetails: error });
      return { success: false, deleted: 0, error: 'Failed to delete comments' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'bulk_delete_comments',
      targetType: 'comment',
      details: { count: parameters.commentIds.length, reason: parameters.reason },
    });

    return { success: true, deleted: count ?? 0 };
  } catch (error) {
    logger.error('Exception in bulkDeleteComments', { errorDetails: error });
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Failed to delete comments',
    };
  }
}
