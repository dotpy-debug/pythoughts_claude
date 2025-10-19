/**
 * Admin Authentication and Authorization Utilities
 *
 * This module provides utilities for:
 * - Checking if a user has admin privileges
 * - Verifying specific admin roles
 * - Logging admin activities
 * - Protecting admin routes and actions
 *
 * @module admin-auth
 */

import { supabase, type Profile, type AdminActivityLog } from './supabase';
import { logger } from './logger';
import { ExternalServiceError, ErrorLogger } from './errors';

/**
 * Admin role types in order of privilege level
 */
export const ADMIN_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  EDITOR: 'editor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

/**
 * Role hierarchy for permission checks
 * Higher number = more privileges
 */
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  user: 0,
  moderator: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Check if a user has admin privileges
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user has admin privileges
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error checking admin status', { error, userId });
      return false;
    }

    return data?.is_admin ?? false;
  } catch (error) {
    logger.error('Exception checking admin status', { error, userId });
    return false;
  }
}

/**
 * Check if a user has a specific role or higher
 * @param userId - The user ID to check
 * @param requiredRole - The minimum required role
 * @returns Promise<boolean> - True if user has the required role or higher
 */
export async function hasRole(
  userId: string,
  requiredRole: AdminRole
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error checking user role', { error, userId, requiredRole });
      return false;
    }

    const userRole = data?.role as AdminRole;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole];

    return userLevel >= requiredLevel;
  } catch (error) {
    logger.error('Exception checking user role', { error, userId, requiredRole });
    return false;
  }
}

/**
 * Get the current user's profile with admin info
 * @param userId - The user ID
 * @returns Promise<Profile | null> - The user's profile or null
 */
export async function getAdminProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching admin profile', { error, userId });
      return null;
    }

    return data as Profile;
  } catch (error) {
    logger.error('Exception fetching admin profile', { error, userId });
    return null;
  }
}

/**
 * Check if a user is suspended
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user is suspended
 */
export async function isUserSuspended(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error checking suspension status', { error, userId });
      return false;
    }

    return data?.is_suspended ?? false;
  } catch (error) {
    logger.error('Exception checking suspension status', { error, userId });
    return false;
  }
}

/**
 * Log an admin activity
 * @param params - Activity logging parameters
 * @returns Promise<string | null> - The activity log ID or null on error
 */
export async function logAdminActivity(params: {
  adminId: string;
  actionType: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('admin_activity_logs')
      .insert({
        admin_id: params.adminId,
        action_type: params.actionType,
        target_type: params.targetType ?? '',
        target_id: params.targetId ?? null,
        details: params.details ?? {},
        ip_address: params.ipAddress ?? '',
        user_agent: params.userAgent ?? '',
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Error logging admin activity', { error, params });
      return null;
    }

    logger.info('Admin activity logged', {
      logId: data.id,
      adminId: params.adminId,
      actionType: params.actionType,
    });

    return data.id;
  } catch (error) {
    logger.error('Exception logging admin activity', { error, params });
    return null;
  }
}

/**
 * Get recent admin activities
 * @param options - Query options
 * @returns Promise<AdminActivityLog[]> - Array of activity logs
 */
export async function getAdminActivities(options: {
  adminId?: string;
  actionType?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminActivityLog[]> {
  try {
    let query = supabase
      .from('admin_activity_logs')
      .select(`
        *,
        profiles:admin_id (
          id,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (options.adminId) {
      query = query.eq('admin_id', options.adminId);
    }

    if (options.actionType) {
      query = query.eq('action_type', options.actionType);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching admin activities', { error, options });
      return [];
    }

    return (data as AdminActivityLog[]) ?? [];
  } catch (error) {
    logger.error('Exception fetching admin activities', { error, options });
    return [];
  }
}

/**
 * Require admin authentication
 * Throws an error if user is not authenticated or not an admin
 * @param userId - The user ID to check
 * @throws Error if user is not an admin
 */
export async function requireAdmin(userId: string | null | undefined): Promise<void> {
  if (!userId) {
    throw new Error('Authentication required');
  }

  const isAdminUser = await isAdmin(userId);
  if (!isAdminUser) {
    throw new Error('Admin privileges required');
  }
}

/**
 * Require specific admin role
 * Throws an error if user doesn't have the required role
 * @param userId - The user ID to check
 * @param requiredRole - The minimum required role
 * @throws Error if user doesn't have the required role
 */
export async function requireRole(
  userId: string | null | undefined,
  requiredRole: AdminRole
): Promise<void> {
  if (!userId) {
    throw new Error('Authentication required');
  }

  const hasRequiredRole = await hasRole(userId, requiredRole);
  if (!hasRequiredRole) {
    throw new Error(`${requiredRole} role required`);
  }
}

/**
 * Get admin statistics for dashboard
 * @returns Promise<object> - Dashboard statistics
 */
export async function getAdminStats(): Promise<{
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  pendingReports: number;
  activeSuspensions: number;
  newUsersToday: number;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total posts
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    // Get total comments
    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    // Get pending reports
    const { count: pendingReports } = await supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get active suspensions
    const { count: activeSuspensions } = await supabase
      .from('user_suspensions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get new users today
    const { count: newUsersToday } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    return {
      totalUsers: totalUsers ?? 0,
      totalPosts: totalPosts ?? 0,
      totalComments: totalComments ?? 0,
      pendingReports: pendingReports ?? 0,
      activeSuspensions: activeSuspensions ?? 0,
      newUsersToday: newUsersToday ?? 0,
    };
  } catch (error) {
    logger.error('Exception fetching admin stats', { error });
    return {
      totalUsers: 0,
      totalPosts: 0,
      totalComments: 0,
      pendingReports: 0,
      activeSuspensions: 0,
      newUsersToday: 0,
    };
  }
}

/**
 * Update user last activity timestamp
 * @param userId - The user ID
 */
export async function updateLastActivity(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    logger.error('Exception updating last activity', { error, userId });
  }
}
