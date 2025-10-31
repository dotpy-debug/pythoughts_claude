/**
 * Publications Administration Server Actions
 *
 * Server actions for managing publications system:
 * - Publication CRUD operations
 * - Member management
 * - Submission workflow
 * - Analytics and insights
 */

import { supabase } from '../lib/supabase';
import { requireRole, logAdminActivity, ADMIN_ROLES } from '../lib/admin-auth';
import { logger } from '../lib/logger';
import type { PublicationMemberWithProfile, PublicationSubmissionWithRelations, DatabaseRecord } from '../types/common';

export interface Publication {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  allow_submissions: boolean;
  require_approval: boolean;
  member_count: number;
  post_count: number;
  subscriber_count: number;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface PublicationMember {
  id: string;
  publication_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'writer' | 'contributor';
  can_publish: boolean;
  can_edit_others: boolean;
  can_delete_posts: boolean;
  can_manage_members: boolean;
  can_manage_settings: boolean;
  post_count: number;
  joined_at: string;
}

export interface PublicationSubmission {
  id: string;
  publication_id: string;
  post_id: string;
  submitter_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  reviewer_id: string | null;
  review_notes: string | null;
  submission_notes: string | null;
  created_at: string;
}

/**
 * Get all publications
 */
export async function getPublications(params: {
  currentUserId: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ publications: Publication[]; total: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    let query = supabase
      .from('publications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,slug.ilike.%${params.search}%`);
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching publications', { errorDetails: error });
      return { publications: [], total: 0, error: 'Failed to fetch publications' };
    }

    return {
      publications: (data as Publication[]) ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in getPublications', { errorDetails: error });
    return {
      publications: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch publications',
    };
  }
}

/**
 * Get publication details
 */
export async function getPublicationDetails(params: {
  currentUserId: string;
  publicationId: string;
}): Promise<{ publication: Publication | null; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const { data, error } = await supabase
      .from('publications')
      .select('*')
      .eq('id', params.publicationId)
      .single();

    if (error) {
      logger.error('Error fetching publication details', { errorDetails: error });
      return { publication: null, error: 'Failed to fetch publication' };
    }

    return { publication: data as Publication };
  } catch (error) {
    logger.error('Exception in getPublicationDetails', { errorDetails: error });
    return {
      publication: null,
      error: error instanceof Error ? error.message : 'Failed to fetch publication',
    };
  }
}

/**
 * Update publication
 */
export async function updatePublication(params: {
  currentUserId: string;
  publicationId: string;
  updates: Partial<Publication>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const { error } = await supabase
      .from('publications')
      .update({
        ...params.updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.publicationId);

    if (error) {
      logger.error('Error updating publication', { errorDetails: error });
      return { success: false, error: 'Failed to update publication' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'update_publication',
      targetType: 'publication',
      targetId: params.publicationId,
      details: { updates: params.updates },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updatePublication', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update publication',
    };
  }
}

/**
 * Delete publication
 */
export async function deletePublication(params: {
  currentUserId: string;
  publicationId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const { error } = await supabase
      .from('publications')
      .delete()
      .eq('id', params.publicationId);

    if (error) {
      logger.error('Error deleting publication', { errorDetails: error });
      return { success: false, error: 'Failed to delete publication' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'delete_publication',
      targetType: 'publication',
      targetId: params.publicationId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in deletePublication', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete publication',
    };
  }
}

/**
 * Get publication members
 */
export async function getPublicationMembers(params: {
  currentUserId: string;
  publicationId: string;
}): Promise<{ members: PublicationMemberWithProfile[]; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const { data, error } = await supabase
      .from('publication_members')
      .select(
        `
        *,
        profiles:user_id (id, username, avatar_url)
      `
      )
      .eq('publication_id', params.publicationId)
      .order('joined_at', { ascending: false });

    if (error) {
      logger.error('Error fetching publication members', { errorDetails: error });
      return { members: [], error: 'Failed to fetch members' };
    }

    return { members: (data as PublicationMemberWithProfile[]) ?? [] };
  } catch (error) {
    logger.error('Exception in getPublicationMembers', { errorDetails: error });
    return {
      members: [],
      error: error instanceof Error ? error.message : 'Failed to fetch members',
    };
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(params: {
  currentUserId: string;
  memberId: string;
  role: 'owner' | 'editor' | 'writer' | 'contributor';
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    // Set permissions based on role
    const permissions = {
      can_publish: ['owner', 'editor'].includes(params.role),
      can_edit_others: ['owner', 'editor'].includes(params.role),
      can_delete_posts: ['owner', 'editor'].includes(params.role),
      can_manage_members: params.role === 'owner',
      can_manage_settings: params.role === 'owner',
    };

    const { error } = await supabase
      .from('publication_members')
      .update({
        role: params.role,
        ...permissions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.memberId);

    if (error) {
      logger.error('Error updating member role', { errorDetails: error });
      return { success: false, error: 'Failed to update member role' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'update_publication_member',
      targetType: 'publication_member',
      targetId: params.memberId,
      details: { role: params.role },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateMemberRole', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update member role',
    };
  }
}

/**
 * Remove publication member
 */
export async function removeMember(params: {
  currentUserId: string;
  memberId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const { error } = await supabase
      .from('publication_members')
      .delete()
      .eq('id', params.memberId);

    if (error) {
      logger.error('Error removing member', { errorDetails: error });
      return { success: false, error: 'Failed to remove member' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'remove_publication_member',
      targetType: 'publication_member',
      targetId: params.memberId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in removeMember', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove member',
    };
  }
}

/**
 * Get publication submissions
 */
export async function getPublicationSubmissions(params: {
  currentUserId: string;
  publicationId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'revision_requested';
}): Promise<{ submissions: PublicationSubmissionWithRelations[]; total: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    let query = supabase
      .from('publication_submissions')
      .select(
        `
        *,
        publications:publication_id (id, name, slug),
        posts:post_id (id, title),
        submitter:submitter_id (id, username),
        reviewer:reviewer_id (id, username)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (params.publicationId) {
      query = query.eq('publication_id', params.publicationId);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching submissions', { errorDetails: error });
      return { submissions: [], total: 0, error: 'Failed to fetch submissions' };
    }

    return {
      submissions: (data as PublicationSubmissionWithRelations[]) ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in getPublicationSubmissions', { errorDetails: error });
    return {
      submissions: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch submissions',
    };
  }
}

/**
 * Review submission (approve/reject)
 */
export async function reviewSubmission(params: {
  currentUserId: string;
  submissionId: string;
  status: 'approved' | 'rejected' | 'revision_requested';
  reviewNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    // If approving, use the database function
    if (params.status === 'approved') {
      const { error } = await supabase.rpc('approve_publication_submission', {
        p_submission_id: params.submissionId,
        p_reviewer_id: params.currentUserId,
        p_notes: params.reviewNotes || null,
      });

      if (error) {
        logger.error('Error approving submission', { errorDetails: error });
        return { success: false, error: 'Failed to approve submission' };
      }
    } else {
      // For rejection or revision request
      const { error } = await supabase
        .from('publication_submissions')
        .update({
          status: params.status,
          reviewer_id: params.currentUserId,
          review_notes: params.reviewNotes,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.submissionId);

      if (error) {
        logger.error('Error reviewing submission', { errorDetails: error });
        return { success: false, error: 'Failed to review submission' };
      }
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'review_publication_submission',
      targetType: 'submission',
      targetId: params.submissionId,
      details: { status: params.status, notes: params.reviewNotes },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in reviewSubmission', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to review submission',
    };
  }
}

/**
 * Get publication analytics
 */
export async function getPublicationAnalytics(params: {
  currentUserId: string;
  publicationId: string;
  dateRange?: '7d' | '30d' | '90d';
}): Promise<{ analytics: DatabaseRecord[] | null; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const days = params.dateRange === '7d' ? 7 : params.dateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('publication_analytics')
      .select('*')
      .eq('publication_id', params.publicationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      logger.error('Error fetching publication analytics', { errorDetails: error });
      return { analytics: null, error: 'Failed to fetch analytics' };
    }

    return { analytics: data ?? [] };
  } catch (error) {
    logger.error('Exception in getPublicationAnalytics', { errorDetails: error });
    return {
      analytics: null,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics',
    };
  }
}

/**
 * Get publication stats summary
 */
export async function getPublicationStats(params: {
  currentUserId: string;
}): Promise<{
  stats: {
    totalPublications: number;
    totalMembers: number;
    totalSubmissions: number;
    pendingSubmissions: number;
  };
  error?: string;
}> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const [publications, members, submissions, pending] = await Promise.all([
      supabase.from('publications').select('*', { count: 'exact', head: true }),
      supabase.from('publication_members').select('*', { count: 'exact', head: true }),
      supabase.from('publication_submissions').select('*', { count: 'exact', head: true }),
      supabase
        .from('publication_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    return {
      stats: {
        totalPublications: publications.count ?? 0,
        totalMembers: members.count ?? 0,
        totalSubmissions: submissions.count ?? 0,
        pendingSubmissions: pending.count ?? 0,
      },
    };
  } catch (error) {
    logger.error('Exception in getPublicationStats', { errorDetails: error });
    return {
      stats: {
        totalPublications: 0,
        totalMembers: 0,
        totalSubmissions: 0,
        pendingSubmissions: 0,
      },
      error: error instanceof Error ? error.message : 'Failed to fetch stats',
    };
  }
}
