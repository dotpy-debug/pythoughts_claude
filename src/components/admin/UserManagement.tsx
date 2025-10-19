/**
 * User Management Component
 *
 * Comprehensive user management interface with:
 * - User list with search and filters
 * - User detail view
 * - Role management
 * - Suspension and ban controls
 * - Activity tracking
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUsers,
  getUserDetails,
  updateUserRole,
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  updateUserNotes,
  getUserSuspensions
} from '../../actions/admin';
import type { Profile, UserSuspension } from '../../lib/supabase';
import {
  Search,
  Filter,
  User,
  Shield,
  Ban,
  UserX,
  Mail,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  Loader2,
} from 'lucide-react';

export function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userSuspensions, setUserSuspensions] = useState<UserSuspension[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [suspendedFilter, setSuspendedFilter] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendType, setSuspendType] = useState<'warning' | 'temporary' | 'permanent'>('warning');
  const [suspendDays, setSuspendDays] = useState(7);

  useEffect(() => {
    if (profile) {
      loadUsers();
    }
  }, [profile, page, searchTerm, roleFilter, suspendedFilter]);

  const loadUsers = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await getUsers({
        currentUserId: profile.id,
        page,
        limit: 50,
        search: searchTerm || undefined,
        role: roleFilter || undefined,
        suspended: suspendedFilter,
      });

      if (!result.error) {
        setUsers(result.users);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (user: Profile) => {
    if (!profile) return;

    setSelectedUser(user);
    setNotes(user.admin_notes || '');
    setEditingNotes(false);

    // Load user's suspension history
    const result = await getUserSuspensions({
      currentUserId: profile.id,
      targetUserId: user.id,
    });

    if (!result.error) {
      setUserSuspensions(result.suspensions);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!profile || !selectedUser) return;

    const confirmed = window.confirm(
      `Change ${selectedUser.username}'s role to ${newRole}?`
    );

    if (!confirmed) return;

    const result = await updateUserRole({
      currentUserId: profile.id,
      targetUserId: selectedUser.id,
      newRole: newRole as any,
    });

    if (result.success) {
      await loadUsers();
      if (selectedUser) {
        await handleUserClick(selectedUser);
      }
    }
  };

  const handleSuspend = async () => {
    if (!profile || !selectedUser || !suspendReason.trim()) return;

    const expiresAt = suspendType === 'temporary'
      ? new Date(Date.now() + suspendDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const result = await suspendUser({
      currentUserId: profile.id,
      targetUserId: selectedUser.id,
      reason: suspendReason,
      suspensionType: suspendType,
      expiresAt,
    });

    if (result.success) {
      setShowSuspendDialog(false);
      setSuspendReason('');
      await loadUsers();
      if (selectedUser) {
        await handleUserClick(selectedUser);
      }
    }
  };

  const handleUnsuspend = async () => {
    if (!profile || !selectedUser) return;

    const confirmed = window.confirm(`Remove suspension for ${selectedUser.username}?`);
    if (!confirmed) return;

    const result = await unsuspendUser({
      currentUserId: profile.id,
      targetUserId: selectedUser.id,
    });

    if (result.success) {
      await loadUsers();
      if (selectedUser) {
        await handleUserClick(selectedUser);
      }
    }
  };

  const handleBan = async () => {
    if (!profile || !selectedUser) return;

    const reason = window.prompt('Enter ban reason:');
    if (!reason) return;

    const confirmed = window.confirm(`Permanently ban ${selectedUser.username}?`);
    if (!confirmed) return;

    const result = await banUser({
      currentUserId: profile.id,
      targetUserId: selectedUser.id,
      reason,
    });

    if (result.success) {
      await loadUsers();
      if (selectedUser) {
        await handleUserClick(selectedUser);
      }
    }
  };

  const handleUnban = async () => {
    if (!profile || !selectedUser) return;

    const confirmed = window.confirm(`Remove ban for ${selectedUser.username}?`);
    if (!confirmed) return;

    const result = await unbanUser({
      currentUserId: profile.id,
      targetUserId: selectedUser.id,
    });

    if (result.success) {
      await loadUsers();
      if (selectedUser) {
        await handleUserClick(selectedUser);
      }
    }
  };

  const handleSaveNotes = async () => {
    if (!profile || !selectedUser) return;

    const result = await updateUserNotes({
      currentUserId: profile.id,
      targetUserId: selectedUser.id,
      notes,
    });

    if (result.success) {
      setEditingNotes(false);
      await loadUsers();
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'admin':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'moderator':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'editor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <User className="w-8 h-8 text-orange-500 mr-3" />
            User Management
          </h1>
          <div className="text-sm text-gray-400">
            {total.toLocaleString()} total users
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-2">
            {/* Search and Filters */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <select
                  value={suspendedFilter === undefined ? '' : suspendedFilter ? 'true' : 'false'}
                  onChange={(e) =>
                    setSuspendedFilter(
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )
                  }
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="">All Status</option>
                  <option value="false">Active</option>
                  <option value="true">Suspended</option>
                </select>
              </div>
            </div>

            {/* User List */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                  <p className="text-gray-400">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No users found</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserClick(user)}
                      className={`w-full p-4 text-left hover:bg-gray-800/50 transition-colors ${
                        selectedUser?.id === user.id ? 'bg-gray-800' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-200">{user.username}</div>
                            <div className="text-sm text-gray-400">
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded border ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {user.role?.replace('_', ' ').toUpperCase()}
                          </span>
                          {user.is_suspended && (
                            <Ban className="w-5 h-5 text-red-400" />
                          )}
                          {user.is_banned && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {total > 50 && (
              <div className="flex items-center justify-between mt-4 px-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {page} of {Math.ceil(total / 50)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / 50)}
                  className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* User Details Panel */}
          <div className="lg:col-span-1">
            {selectedUser ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 sticky top-4">
                <h3 className="text-lg font-semibold text-white mb-4">User Details</h3>

                {/* User Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Username</label>
                    <div className="text-gray-200 font-semibold">{selectedUser.username}</div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Role</label>
                    <select
                      value={selectedUser.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      disabled={profile?.role !== 'super_admin'}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 disabled:opacity-50"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Status</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedUser.is_banned ? (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm">
                          Banned
                        </span>
                      ) : selectedUser.is_suspended ? (
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-sm">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-sm">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-gray-400">Admin Notes</label>
                      {editingNotes ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveNotes}
                            className="p-1 hover:bg-gray-800 rounded"
                          >
                            <Save className="w-4 h-4 text-green-400" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingNotes(false);
                              setNotes(selectedUser.admin_notes || '');
                            }}
                            className="p-1 hover:bg-gray-800 rounded"
                          >
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingNotes(true)}
                          className="p-1 hover:bg-gray-800 rounded"
                        >
                          <Edit className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                    {editingNotes ? (
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 resize-none"
                        rows={4}
                      />
                    ) : (
                      <div className="p-3 bg-gray-800 rounded-lg text-gray-300 text-sm min-h-[80px]">
                        {selectedUser.admin_notes || 'No notes'}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-800 space-y-2">
                    {!selectedUser.is_suspended ? (
                      <button
                        onClick={() => setShowSuspendDialog(true)}
                        className="w-full px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg transition-colors"
                      >
                        Suspend User
                      </button>
                    ) : (
                      <button
                        onClick={handleUnsuspend}
                        className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-colors"
                      >
                        Remove Suspension
                      </button>
                    )}

                    {!selectedUser.is_banned ? (
                      <button
                        onClick={handleBan}
                        disabled={profile?.role !== 'admin' && profile?.role !== 'super_admin'}
                        className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Ban User
                      </button>
                    ) : (
                      <button
                        onClick={handleUnban}
                        disabled={profile?.role !== 'admin' && profile?.role !== 'super_admin'}
                        className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Unban User
                      </button>
                    )}
                  </div>

                  {/* Suspension History */}
                  {userSuspensions.length > 0 && (
                    <div className="pt-4 border-t border-gray-800">
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">
                        Suspension History
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {userSuspensions.map((suspension) => (
                          <div
                            key={suspension.id}
                            className="p-3 bg-gray-800 rounded-lg text-sm"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                suspension.is_active
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-gray-700 text-gray-400'
                              }`}>
                                {suspension.suspension_type}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {new Date(suspension.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-300">{suspension.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center text-gray-400">
                Select a user to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suspend User Dialog */}
      {showSuspendDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">
              Suspend {selectedUser.username}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Suspension Type</label>
                <select
                  value={suspendType}
                  onChange={(e) => setSuspendType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                >
                  <option value="warning">Warning</option>
                  <option value="temporary">Temporary</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

              {suspendType === 'temporary' && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Duration (days)</label>
                  <input
                    type="number"
                    value={suspendDays}
                    onChange={(e) => setSuspendDays(parseInt(e.target.value) || 7)}
                    min="1"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Reason</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 resize-none"
                  rows={4}
                  placeholder="Enter reason for suspension..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSuspend}
                  disabled={!suspendReason.trim()}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suspend
                </button>
                <button
                  onClick={() => {
                    setShowSuspendDialog(false);
                    setSuspendReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
