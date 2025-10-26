/**
 * Permissions and Roles Management Server Actions
 *
 * Server actions for managing roles and permissions:
 * - Role CRUD operations
 * - Permission management
 * - Role assignment
 * - Permission audit logs
 */

import { supabase, type AdminRole } from '../lib/supabase';
import { requireRole, logAdminActivity, ADMIN_ROLES } from '../lib/admin-auth';
import { logger } from '../lib/logger';

/**
 * Get all admin roles
 */
export async function getAdminRoles(params: {
  currentUserId: string;
}): Promise<{ roles: AdminRole[]; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const { data, error } = await supabase
      .from('admin_roles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching admin roles', { errorDetails: error });
      return { roles: [], error: 'Failed to fetch roles' };
    }

    return { roles: (data as AdminRole[]) ?? [] };
  } catch (error) {
    logger.error('Exception in getAdminRoles', { errorDetails: error });
    return {
      roles: [],
      error: error instanceof Error ? error.message : 'Failed to fetch roles',
    };
  }
}

/**
 * Create a new role
 */
export async function createAdminRole(params: {
  currentUserId: string;
  name: string;
  description: string;
  permissions: Record<string, boolean | unknown>;
}): Promise<{ role: AdminRole | null; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const { data, error } = await supabase
      .from('admin_roles')
      .insert({
        name: params.name,
        description: params.description,
        permissions: params.permissions,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating admin role', { errorDetails: error });
      return { role: null, error: 'Failed to create role' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'create_admin_role',
      targetType: 'role',
      targetId: data.id,
      details: { name: params.name },
    });

    return { role: data as AdminRole };
  } catch (error) {
    logger.error('Exception in createAdminRole', { errorDetails: error });
    return {
      role: null,
      error: error instanceof Error ? error.message : 'Failed to create role',
    };
  }
}

/**
 * Update role permissions
 */
export async function updateAdminRole(params: {
  currentUserId: string;
  roleId: string;
  updates: Partial<AdminRole>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const { error } = await supabase
      .from('admin_roles')
      .update({
        ...params.updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.roleId);

    if (error) {
      logger.error('Error updating admin role', { errorDetails: error });
      return { success: false, error: 'Failed to update role' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'update_admin_role',
      targetType: 'role',
      targetId: params.roleId,
      details: { updates: params.updates },
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in updateAdminRole', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role',
    };
  }
}

/**
 * Delete a role
 */
export async function deleteAdminRole(params: {
  currentUserId: string;
  roleId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    // Don't allow deleting default roles
    const { data: role } = await supabase
      .from('admin_roles')
      .select('name')
      .eq('id', params.roleId)
      .single();

    if (role && ['super_admin', 'admin', 'moderator', 'editor'].includes(role.name)) {
      return { success: false, error: 'Cannot delete default roles' };
    }

    const { error } = await supabase.from('admin_roles').delete().eq('id', params.roleId);

    if (error) {
      logger.error('Error deleting admin role', { errorDetails: error });
      return { success: false, error: 'Failed to delete role' };
    }

    await logAdminActivity({
      adminId: params.currentUserId,
      actionType: 'delete_admin_role',
      targetType: 'role',
      targetId: params.roleId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Exception in deleteAdminRole', { errorDetails: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete role',
    };
  }
}

/**
 * Get users by role
 */
export async function getUsersByRole(params: {
  currentUserId: string;
  role: string;
}): Promise<{ users: any[]; total: number; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);

    const { data, error, count } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role, created_at', { count: 'exact' })
      .eq('role', params.role)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching users by role', { errorDetails: error });
      return { users: [], total: 0, error: 'Failed to fetch users' };
    }

    return {
      users: data ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    logger.error('Exception in getUsersByRole', { errorDetails: error });
    return {
      users: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    };
  }
}

/**
 * Available permissions definitions
 */
export const AVAILABLE_PERMISSIONS = {
  // User Management
  users: {
    label: 'User Management',
    description: 'View and manage user accounts',
  },
  users_edit: {
    label: 'Edit Users',
    description: 'Edit user profiles and settings',
  },
  users_suspend: {
    label: 'Suspend Users',
    description: 'Suspend and ban users',
  },
  users_delete: {
    label: 'Delete Users',
    description: 'Permanently delete user accounts',
  },

  // Content Management
  content: {
    label: 'Content Management',
    description: 'View and manage content',
  },
  content_edit: {
    label: 'Edit Content',
    description: 'Edit posts and comments',
  },
  content_delete: {
    label: 'Delete Content',
    description: 'Delete posts and comments',
  },
  content_feature: {
    label: 'Feature Content',
    description: 'Mark content as featured',
  },

  // Categories and Tags
  categories: {
    label: 'Categories Management',
    description: 'Manage categories',
  },
  tags: {
    label: 'Tags Management',
    description: 'Manage tags',
  },

  // Reports and Moderation
  reports: {
    label: 'View Reports',
    description: 'Access content reports',
  },
  reports_moderate: {
    label: 'Moderate Reports',
    description: 'Resolve content reports',
  },

  // Analytics
  analytics: {
    label: 'View Analytics',
    description: 'Access platform analytics',
  },
  analytics_export: {
    label: 'Export Analytics',
    description: 'Export analytics data',
  },

  // Settings
  settings: {
    label: 'System Settings',
    description: 'Manage system settings',
  },
  settings_security: {
    label: 'Security Settings',
    description: 'Manage security settings',
  },

  // Database
  database: {
    label: 'Database Access',
    description: 'Direct database access (DANGEROUS)',
  },

  // Roles and Permissions
  roles: {
    label: 'Role Management',
    description: 'Manage roles and permissions',
  },

  // All permissions (super admin only)
  all: {
    label: 'All Permissions',
    description: 'Full system access',
  },
};

/**
 * Get permission definitions
 */
export async function getPermissionDefinitions(params: {
  currentUserId: string;
}): Promise<{ permissions: typeof AVAILABLE_PERMISSIONS; error?: string }> {
  try {
    await requireRole(params.currentUserId, ADMIN_ROLES.SUPER_ADMIN);
    return { permissions: AVAILABLE_PERMISSIONS };
  } catch (error) {
    return {
      permissions: AVAILABLE_PERMISSIONS,
      error: error instanceof Error ? error.message : 'Access denied',
    };
  }
}
