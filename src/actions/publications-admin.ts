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
export async function getPublications(parameters: {
  currentUserId: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ publications: Publication[]; total: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    let query = supabase
      .from('publications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (parameters.search) {
      query = query.or(`name.ilike.%${parameters.search}%,slug.ilike.%${parameters.search}%`);
    }

    const page = parameters.page || 1;
    const limit = parameters.limit || 20;
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
export async function getPublicationDetails(parameters: {
  currentUserId: string;
  publicationId: string;
}): Promise<{ publication: Publication | null; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    const { data, error } = await supabase
      .from('publications')
      .select('*')
      .eq('id', parameters.publicationId)
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
export async function updatePublication(parameters: {
  currentUserId: string;
  publicationId: string;
  updates: Partial<Publication>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    const { error } = await supabase
      .from('publications')
      .update({
        ...parameters.updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parameters.publicationId);

    if (error) {
      logger.error('Error updating publication', { errorDetails: error });
      return { success: false, error: 'Failed to update publication' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'update_publication',
      targetType: 'publication',
      targetId: parameters.publicationId,
      details: { updates: parameters.updates },
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
export async function deletePublication(parameters: {
  currentUserId: string;
  publicationId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const { error } = await supabase
      .from('publications')
      .delete()
      .eq('id', parameters.publicationId);

    if (error) {
      logger.error('Error deleting publication', { errorDetails: error });
      return { success: false, error: 'Failed to delete publication' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'delete_publication',
      targetType: 'publication',
      targetId: parameters.publicationId,
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
export async function getPublicationMembers(parameters: {
  currentUserId: string;
  publicationId: string;
}): Promise<{ members: PublicationMemberWithProfile[]; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    const { data, error } = await supabase
      .from('publication_members')
      .select(
        `
        *,
        profiles:user_id (id, username, avatar_url)
      `
      )
      .eq('publication_id', parameters.publicationId)
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
export async function updateMemberRole(parameters: {
  currentUserId: string;
  memberId: string;
  role: 'owner' | 'editor' | 'writer' | 'contributor';
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    // Set permissions based on role
    const permissions = {
      can_publish: ['owner', 'editor'].includes(parameters.role),
      can_edit_others: ['owner', 'editor'].includes(parameters.role),
      can_delete_posts: ['owner', 'editor'].includes(parameters.role),
      can_manage_members: parameters.role === 'owner',
      can_manage_settings: parameters.role === 'owner',
    };

    const { error } = await supabase
      .from('publication_members')
      .update({
        role: parameters.role,
        ...permissions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parameters.memberId);

    if (error) {
      logger.error('Error updating member role', { errorDetails: error });
      return { success: false, error: 'Failed to update member role' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'update_publication_member',
      targetType: 'publication_member',
      targetId: parameters.memberId,
      details: { role: parameters.role },
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
export async function removeMember(parameters: {
  currentUserId: string;
  memberId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    const { error } = await supabase
      .from('publication_members')
      .delete()
      .eq('id', parameters.memberId);

    if (error) {
      logger.error('Error removing member', { errorDetails: error });
      return { success: false, error: 'Failed to remove member' };
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'remove_publication_member',
      targetType: 'publication_member',
      targetId: parameters.memberId,
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
export async function getPublicationSubmissions(parameters: {
  currentUserId: string;
  publicationId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'revision_requested';
}): Promise<{ submissions: PublicationSubmissionWithRelations[]; total: number; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

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

    if (parameters.publicationId) {
      query = query.eq('publication_id', parameters.publicationId);
    }

    if (parameters.status) {
      query = query.eq('status', parameters.status);
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
export async function reviewSubmission(parameters: {
  currentUserId: string;
  submissionId: string;
  status: 'approved' | 'rejected' | 'revision_requested';
  reviewNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    // If approving, use the database function
    if (parameters.status === 'approved') {
      const { error } = await supabase.rpc('approve_publication_submission', {
        p_submission_id: parameters.submissionId,
        p_reviewer_id: parameters.currentUserId,
        p_notes: parameters.reviewNotes || null,
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
          status: parameters.status,
          reviewer_id: parameters.currentUserId,
          review_notes: parameters.reviewNotes,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', parameters.submissionId);

      if (error) {
        logger.error('Error reviewing submission', { errorDetails: error });
        return { success: false, error: 'Failed to review submission' };
      }
    }

    await logAdminActivity({
      adminId: parameters.currentUserId,
      actionType: 'review_publication_submission',
      targetType: 'submission',
      targetId: parameters.submissionId,
      details: { status: parameters.status, notes: parameters.reviewNotes },
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
export async function getPublicationAnalytics(parameters: {
  currentUserId: string;
  publicationId: string;
  dateRange?: '7d' | '30d' | '90d';
}): Promise<{ analytics: DatabaseRecord[] | null; error?: string }> {
  try {
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

    const days = parameters.dateRange === '7d' ? 7 : (parameters.dateRange === '30d' ? 30 : 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('publication_analytics')
      .select('*')
      .eq('publication_id', parameters.publicationId)
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
export async function getPublicationStats(parameters: {
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
    await requireRole(parameters.currentUserId, ADMIN_ROLES.ADMIN);

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
