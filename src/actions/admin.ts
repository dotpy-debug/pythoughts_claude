/**
 * Admin Server Actions
 *
 * This module provides server actions for admin operations:
 * - User management (suspend, ban, update role)
 * - Content moderation
 * - System settings management
 * - Activity logging
 *
 * @module actions/admin
 */

import { supabase, type Profile, type UserSuspension, type SystemSetting } from '../lib/supabase';
import {
  requireAdmin,
  requireRole,
  logAdminActivity,
  getAdminStats,
  ADMIN_ROLES,
  type AdminRole,
} from '../lib/admin-auth';
import { logger } from '../lib/logger';

/**
 * Dashboard statistics type
 */
export interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  pendingReports: number;
  activeSuspensions: number;
  newUsersToday: number;
}

/**
 * Get all users with pagination and filtering
 */
export async function getUsers(params: {
  currentUserId: string;
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminRole;
  suspended?: boolean;
}): Promise<{ users: Profile[]; total: number; error?: string }> {
  try {
    await requireAdmin(params.currentUserId);

    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.search) {
      query = query.or(`username.ilike.%${params.search}%,bio.ilike.%${params.search}%`);
    }

    if (params.role) {
      query = query.eq('role', params.role);
    }

    if (params.suspended !== undefined) {
      query = query.eq('is_suspended', params.suspended);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching users', { errorDetails: error });
      return { users: [], total: 0, error: 'Failed to fetch users' };
    }

    return {
      users: (data as Profile[]) ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in getUsers', { errorDetails: error });
    return {
      users: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    };
  }
}

/**
 * Get a single user's detailed information
 */
export async function getUserDetails(params: {
  currentUserId: string;
  targetUserId: string;
}): Promise<{ user: Profile | null; error?: string }> {
  try {
    await requireAdmin(params.currentUserId);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.targetUserId)
      .single();

    if (error) {
      logger.error('Error fetching user details', { errorDetails: error });
      return { user: null, error: 'Failed to fetch user details' };
    }

    return { user: data as Profile };
  } catch (error) {
    logger.error('Exception in getUserDetails', { errorDetails: error });
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Failed to fetch user details',
    };
  }
}

/**
 * Update a user's role
 */
export async function updateUserRole(params: {
  currentUserId: string;
  targetUserId: string;
  newRole: AdminRole;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Only super_admin can change roles
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const { error } = await supabase
      .from('profiles')
      .update({ role: params.newRole })
      .eq('id', params.targetUserId);

    if (error) {
      logger.error('Error updating user role', { errorDetails: error });
      return { success: false, error: 'Failed to update user role' };
    }

    // Log the activity
    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'update_user_role',
      targetType: 'user',
      targetId: params.targetUserId,
      details: { newRole: params.newRole },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateUserRole', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user role',
    };
  }
}

/**
 * Suspend a user
 */
export async function suspendUser(params: {
  currentUserId: string;
  targetUserId: string;
  reason: string;
  suspensionType: 'warning' | 'temporary' | 'permanent';
  expiresAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    // Create suspension record
    const { error: suspensionError } = await supabase
      .from('user_suspensions')
      .insert({
        user_id: params.targetUserId,
        suspended_by: params.currentUserId,
        reason: params.reason,
        suspension_type: params.suspensionType,
        expires_at: params.expiresAt ?? null,
        is_active: true,
      });

    if (suspensionError) {
      logger.error('Error creating suspension', { error: suspensionError });
      return { success: false, error: 'Failed to suspend user' };
    }

    // Update user's suspension status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_suspended: true })
      .eq('id', params.targetUserId);

    if (updateError) {
      logger.error('Error updating user suspension status', { error: updateError });
      return { success: false, error: 'Failed to update user status' };
    }

    // Log the activity
    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'suspend_user',
      targetType: 'user',
      targetId: params.targetUserId,
      details: {
        reason: params.reason,
        suspensionType: params.suspensionType,
        expiresAt: params.expiresAt,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in suspendUser', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to suspend user',
    };
  }
}

/**
 * Unsuspend a user
 */
export async function unsuspendUser(params: {
  currentUserId: string;
  targetUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.MODERATOR);

    // Deactivate all active suspensions
    const { error: suspensionError } = await supabase
      .from('user_suspensions')
      .update({ is_active: false })
      .eq('user_id', params.targetUserId)
      .eq('is_active', true);

    if (suspensionError) {
      logger.error('Error deactivating suspensions', { error: suspensionError });
      return { success: false, error: 'Failed to unsuspend user' };
    }

    // Update user's suspension status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_suspended: false })
      .eq('id', params.targetUserId);

    if (updateError) {
      logger.error('Error updating user suspension status', { error: updateError });
      return { success: false, error: 'Failed to update user status' };
    }

    // Log the activity
    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'unsuspend_user',
      targetType: 'user',
      targetId: params.targetUserId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in unsuspendUser', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unsuspend user',
    };
  }
}

/**
 * Ban a user permanently
 */
export async function banUser(params: {
  currentUserId: string;
  targetUserId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    // Create permanent suspension
    const { error: suspensionError } = await supabase
      .from('user_suspensions')
      .insert({
        user_id: params.targetUserId,
        suspended_by: params.currentUserId,
        reason: params.reason,
        suspension_type: 'permanent',
        is_active: true,
      });

    if (suspensionError) {
      logger.error('Error creating ban', { error: suspensionError });
      return { success: false, error: 'Failed to ban user' };
    }

    // Update user's ban status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_banned: true,
        is_suspended: true,
      })
      .eq('id', params.targetUserId);

    if (updateError) {
      logger.error('Error updating user ban status', { error: updateError });
      return { success: false, error: 'Failed to update user status' };
    }

    // Log the activity
    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'ban_user',
      targetType: 'user',
      targetId: params.targetUserId,
      details: { reason: params.reason },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in banUser', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to ban user',
    };
  }
}

/**
 * Unban a user
 */
export async function unbanUser(params: {
  currentUserId: string;
  targetUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    // Deactivate all suspensions
    const { error: suspensionError } = await supabase
      .from('user_suspensions')
      .update({ is_active: false })
      .eq('user_id', params.targetUserId)
      .eq('is_active', true);

    if (suspensionError) {
      logger.error('Error deactivating ban', { error: suspensionError });
      return { success: false, error: 'Failed to unban user' };
    }

    // Update user's ban status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_banned: false,
        is_suspended: false,
      })
      .eq('id', params.targetUserId);

    if (updateError) {
      logger.error('Error updating user ban status', { error: updateError });
      return { success: false, error: 'Failed to update user status' };
    }

    // Log the activity
    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'unban_user',
      targetType: 'user',
      targetId: params.targetUserId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in unbanUser', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unban user',
    };
  }
}

/**
 * Update admin notes for a user
 */
export async function updateUserNotes(params: {
  currentUserId: string;
  targetUserId: string;
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin(params.currentUserId);

    const { error } = await supabase
      .from('profiles')
      .update({ admin_notes: params.notes })
      .eq('id', params.targetUserId);

    if (error) {
      logger.error('Error updating user notes', { errorDetails: error });
      return { success: false, error: 'Failed to update user notes' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'update_user_notes',
      targetType: 'user',
      targetId: params.targetUserId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateUserNotes', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user notes',
    };
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(params: {
  currentUserId: string;
}): Promise<{ stats: DashboardStats | null; error?: string }> {
  try {
    await requireAdmin(params.currentUserId);

    const stats = await getAdminStats();

    return { stats };
  } catch (error) {
    logger.error('Exception in getDashboardStats', { errorDetails: error });
    return {
      stats: null,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
    };
  }
}

/**
 * Get user suspensions
 */
export async function getUserSuspensions(params: {
  currentUserId: string;
  targetUserId?: string;
  activeOnly?: boolean;
}): Promise<{ suspensions: UserSuspension[]; error?: string }> {
  try {
    await requireAdmin(params.currentUserId);

    let query = supabase
      .from('user_suspensions')
      .select(`
        *,
        user_profile:user_id (id, username, avatar_url),
        admin_profile:suspended_by (id, username, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (params.targetUserId) {
      query = query.eq('user_id', params.targetUserId);
    }

    if (params.activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching suspensions', { errorDetails: error });
      return { suspensions: [], error: 'Failed to fetch suspensions' };
    }

    return { suspensions: (data as UserSuspension[]) ?? [] };
  } catch (error) {
    logger.error('Exception in getUserSuspensions', { errorDetails: error });
    return {
      suspensions: [],
      error: error instanceof Error ? error.message : 'Failed to fetch suspensions',
    };
  }
}

/**
 * Get system settings
 */
export async function getSystemSettings(params: {
  currentUserId: string;
  category?: string;
}): Promise<{ settings: SystemSetting[]; error?: string }> {
  try {
    await requireAdmin(params.currentUserId);

    let query = supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (params.category) {
      query = query.eq('category', params.category);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching system settings', { errorDetails: error });
      return { settings: [], error: 'Failed to fetch settings' };
    }

    return { settings: (data as SystemSetting[]) ?? [] };
  } catch (error) {
    logger.error('Exception in getSystemSettings', { errorDetails: error });
    return {
      settings: [],
      error: error instanceof Error ? error.message : 'Failed to fetch settings',
    };
  }
}

/**
 * Update system setting
 */
export async function updateSystemSetting(params: {
  currentUserId: string;
  key: string;
  value: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.ADMIN);

    const { error } = await supabase
      .from('system_settings')
      .update({
        value: params.value,
        updated_by: params.currentUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', params.key);

    if (error) {
      logger.error('Error updating system setting', { errorDetails: error });
      return { success: false, error: 'Failed to update setting' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'update_system_setting',
      targetType: 'setting',
      details: { key: params.key, value: params.value },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateSystemSetting', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update setting',
    };
  }
}

/**
 * Delete a user (soft delete)
 */
export async function deleteUser(params: {
  currentUserId: string;
  targetUserId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    // Instead of hard delete, ban the user permanently
    const result = await banUser({
      currentUserId: params.currentUserId,
      targetUserId: params.targetUserId,
      reason: `Account deleted: ${params.reason}`,
    });

    if (!result.success) {
      return result;
    }

    // Log the deletion
    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'delete_user',
      targetType: 'user',
      targetId: params.targetUserId,
      details: { reason: params.reason },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in deleteUser', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}
