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
export async function getContentReports(params: {
  currentUserId: string;
  status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reportType?: string;
  page?: number;
  limit?: number;
}): Promise<{ reports: ContentReport[]; total: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
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

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.reportType) {
      query = query.eq('report_type', params.reportType);
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
export async function updateReportStatus(params: {
  currentUserId: string;
  reportId: string;
  status: 'reviewing' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    const updates: any = {
      status: params.status,
      assigned_to: params.currentUserId,
      updated_at: new Date().toISOString(),
    };

    if (params.resolutionNotes) {
      updates.resolution_notes = params.resolutionNotes;
    }

    if (params.status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('content_reports')
      .update(updates)
      .eq('id', params.reportId);

    if (error) {
      logger.error('Error updating report status', { errorDetails: error });
      return { success: false, error: 'Failed to update report' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'update_report_status',
      targetType: 'report',
      targetId: params.reportId,
      details: { status: params.status },
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
export async function getPostsForModeration(params: {
  currentUserId: string;
  filter?: 'all' | 'flagged' | 'drafts' | 'published';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ posts: Post[]; total: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
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

    if (params.filter === 'drafts') {
      query = query.eq('is_draft', true);
    } else if (params.filter === 'published') {
      query = query.eq('is_published', true);
    }

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`);
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
export async function deletePost(params: {
  currentUserId: string;
  postId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    const { error } = await supabase.from('posts').delete().eq('id', params.postId);

    if (error) {
      logger.error('Error deleting post', { errorDetails: error });
      return { success: false, error: 'Failed to delete post' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'delete_post',
      targetType: 'post',
      targetId: params.postId,
      details: { reason: params.reason },
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
export async function moderatePost(params: {
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
    await requireRole(params.currentUserId, ADMIN_ROLES.EDITOR);

    const { error } = await supabase
      .from('posts')
      .update({
        ...params.updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.postId);

    if (error) {
      logger.error('Error moderating post', { errorDetails: error });
      return { success: false, error: 'Failed to moderate post' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'moderate_post',
      targetType: 'post',
      targetId: params.postId,
      details: { updates: params.updates, reason: params.reason },
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
export async function toggleFeaturedPost(params: {
  currentUserId: string;
  postId: string;
  featured: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.EDITOR);

    const { error } = await supabase
      .from('posts')
      .update({ featured: params.featured })
      .eq('id', params.postId);

    if (error) {
      logger.error('Error toggling featured status', { errorDetails: error });
      return { success: false, error: 'Failed to update post' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: params.featured ? 'feature_post' : 'unfeature_post',
      targetType: 'post',
      targetId: params.postId,
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
export async function getCommentsForModeration(params: {
  currentUserId: string;
  postId?: string;
  flagged?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ comments: Comment[]; total: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
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

    if (params.postId) {
      query = query.eq('post_id', params.postId);
    }

    if (params.flagged !== undefined) {
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
export async function deleteComment(params: {
  currentUserId: string;
  commentId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    // Soft delete
    const { error } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        content: '[deleted by moderator]',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.commentId);

    if (error) {
      logger.error('Error deleting comment', { errorDetails: error });
      return { success: false, error: 'Failed to delete comment' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'delete_comment',
      targetType: 'comment',
      targetId: params.commentId,
      details: { reason: params.reason },
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
export async function bulkDeletePosts(params: {
  currentUserId: string;
  postIds: string[];
  reason: string;
}): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    const { error, count } = await supabase
      .from('posts')
      .delete()
      .in('id', params.postIds);

    if (error) {
      logger.error('Error bulk deleting posts', { errorDetails: error });
      return { success: false, deleted: 0, error: 'Failed to delete posts' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'bulk_delete_posts',
      targetType: 'post',
      details: { count: params.postIds.length, reason: params.reason },
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
export async function bulkDeleteComments(params: {
  currentUserId: string;
  commentIds: string[];
  reason: string;
}): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    const { error, count } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        content: '[deleted by moderator]',
        updated_at: new Date().toISOString(),
      })
      .in('id', params.commentIds);

    if (error) {
      logger.error('Error bulk deleting comments', { errorDetails: error });
      return { success: false, deleted: 0, error: 'Failed to delete comments' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'bulk_delete_comments',
      targetType: 'comment',
      details: { count: params.commentIds.length, reason: params.reason },
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
