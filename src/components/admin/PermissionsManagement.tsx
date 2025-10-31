/**
 * Permissions and Roles Management Component
 *
 * Comprehensive interface for managing roles and permissions:
 * - View all roles
 * - Create custom roles
 * - Edit role permissions
 * - View users by role
 * - Permission templates
 * - Audit logs
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  getUsersByRole,
  AVAILABLE_PERMISSIONS,
} from '../../actions/permissions';
import type { AdminRole } from '../../lib/supabase';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Loader2,
  Save,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export function PermissionsManagement() {
  const { profile, isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>,
  });

  const loadRoles = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await getAdminRoles({ currentUserId: profile.id });
      if (!result.error) {
        setRoles(result.roles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const loadRoleUsers = useCallback(async (roleName: string) => {
    if (!profile) return;

    try {
      const result = await getUsersByRole({
        currentUserId: profile.id,
        role: roleName,
      });
      if (!result.error) {
        setRoleUsers(result.users);
      }
    } catch (error) {
      console.error('Error loading role users:', error);
    }
  }, [profile]);

  useEffect(() => {
    if (profile && isSuperAdmin) {
      loadRoles();
    }
  }, [profile, isSuperAdmin, loadRoles]);

  useEffect(() => {
    if (selectedRole && profile) {
      loadRoleUsers(selectedRole.name);
    }
  }, [selectedRole, profile, loadRoleUsers]);

  const handleCreateRole = async () => {
    if (!profile) return;

    const result = await createAdminRole({
      currentUserId: profile.id,
      name: roleForm.name,
      description: roleForm.description,
      permissions: roleForm.permissions,
    });

    if (result.role) {
      setShowCreateForm(false);
      setRoleForm({ name: '', description: '', permissions: {} });
      await loadRoles();
    }
  };

  const handleUpdateRole = async () => {
    if (!profile || !editingRole) return;

    const result = await updateAdminRole({
      currentUserId: profile.id,
      roleId: editingRole.id,
      updates: {
        description: roleForm.description,
        permissions: roleForm.permissions,
      },
    });

    if (result.success) {
      setEditingRole(null);
      await loadRoles();
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!profile) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this role? Users with this role will be downgraded to regular users.'
    );
    if (!confirmed) return;

    const result = await deleteAdminRole({
      currentUserId: profile.id,
      roleId,
    });

    if (result.success) {
      await loadRoles();
    } else if (result.error) {
      alert(result.error);
    }
  };

  const togglePermission = (key: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Access Denied</h2>
          <p className="text-gray-300">
            Permissions management is only accessible to super administrators.
          </p>
        </div>
      </div>
    );
  }

  const permissionCategories = {
    'User Management': ['users', 'users_edit', 'users_suspend', 'users_delete'],
    'Content Management': ['content', 'content_edit', 'content_delete', 'content_feature'],
    'Categories & Tags': ['categories', 'tags'],
    'Reports': ['reports', 'reports_moderate'],
    'Analytics': ['analytics', 'analytics_export'],
    'Settings': ['settings', 'settings_security'],
    'System': ['database', 'roles', 'all'],
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Warning Banner */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-red-400 font-semibold mb-1">Dangerous Zone</h3>
            <p className="text-gray-300 text-sm">
              Changing roles and permissions directly affects user access. Be extremely careful when
              modifying permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Shield className="w-8 h-8 text-orange-500 mr-3" />
            Roles & Permissions Management
          </h1>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setRoleForm({ name: '', description: '', permissions: {} });
            }}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Role
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Roles</h3>
              {loading ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
                </div>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className={`
                        w-full text-left px-3 py-3 rounded-lg transition-colors
                        ${
                          selectedRole?.id === role.id
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }
                      `}
                    >
                      <div className="font-semibold">{role.name}</div>
                      <div className="text-xs opacity-75">{role.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Role Details */}
          <div className="col-span-2">
            {selectedRole ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">{selectedRole.name}</h2>
                    <p className="text-sm text-gray-400">{selectedRole.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingRole(selectedRole);
                        setRoleForm({
                          name: selectedRole.name,
                          description: selectedRole.description,
                          permissions: selectedRole.permissions as Record<string, boolean>,
                        });
                      }}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded"
                      disabled={['super_admin', 'admin', 'moderator', 'editor'].includes(
                        selectedRole.name
                      )}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(selectedRole.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                      disabled={['super_admin', 'admin', 'moderator', 'editor'].includes(
                        selectedRole.name
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Permissions Display */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                    Permissions
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(permissionCategories).map(([category, perms]) => (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">{category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {perms.map((perm) => {
                            const hasPermission =
                              selectedRole.permissions[perm as keyof typeof selectedRole.permissions];
                            const permDef =
                              AVAILABLE_PERMISSIONS[perm as keyof typeof AVAILABLE_PERMISSIONS];

                            return (
                              <div
                                key={perm}
                                className={`px-3 py-2 rounded text-sm ${
                                  hasPermission
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-gray-800 text-gray-500'
                                }`}
                                title={permDef?.description}
                              >
                                {hasPermission ? (
                                  <CheckCircle className="w-4 h-4 inline mr-2" />
                                ) : (
                                  <XCircle className="w-4 h-4 inline mr-2" />
                                )}
                                {permDef?.label || perm}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users with this role */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Users with this Role ({roleUsers.length})
                  </h3>
                  {roleUsers.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {roleUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-3 px-3 py-2 bg-gray-800 rounded"
                        >
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-gray-200 font-medium">{user.username}</div>
                            <div className="text-xs text-gray-500">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No users with this role</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                <Shield className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400">Select a role to view details and permissions</p>
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Role Modal */}
        {(showCreateForm || editingRole) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl w-full my-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Role Name</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    disabled={!!editingRole}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 disabled:opacity-50"
                    placeholder="e.g., content_manager"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 resize-none"
                    rows={2}
                    placeholder="Brief description of this role"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Permissions</label>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {Object.entries(permissionCategories).map(([category, perms]) => (
                      <div key={category} className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">{category}</h4>
                        <div className="space-y-2">
                          {perms.map((perm) => {
                            const permDef =
                              AVAILABLE_PERMISSIONS[perm as keyof typeof AVAILABLE_PERMISSIONS];

                            return (
                              <label
                                key={perm}
                                className="flex items-start space-x-3 cursor-pointer hover:bg-gray-700 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={roleForm.permissions[perm] || false}
                                  onChange={() => togglePermission(perm)}
                                  className="mt-1"
                                />
                                <div>
                                  <div className="text-gray-200 font-medium">
                                    {permDef?.label || perm}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {permDef?.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-800">
                <button
                  onClick={editingRole ? handleUpdateRole : handleCreateRole}
                  disabled={!roleForm.name || !roleForm.description}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingRole(null);
                    setRoleForm({ name: '', description: '', permissions: {} });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
