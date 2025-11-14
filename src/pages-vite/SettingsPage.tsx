import { useState, useEffect, useCallback } from 'react';
import { Loader2, User, Bell, Palette, Shield, UserX, Search, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { ShadcnCard, ShadcnCardHeader, ShadcnCardContent } from '../components/ui/ShadcnCard';
import { ShadcnButton } from '../components/ui/ShadcnButton';

type BlockedUser = {
  id: string;
  username: string;
  avatar_url: string;
};

export function SettingsPage() {
  const { user, profile } = useAuth();
  const { theme, fontSize, toggleTheme, setFontSize } = useTheme();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'notifications' | 'appearance'>('profile');

  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    avatar_url: '',
  });

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [searching, setSearching] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState({
    emailOnNewFollower: true,
    emailOnComment: true,
    emailOnClap: true,
    emailOnMention: true,
    emailWeeklyDigest: true,
    pushNotifications: true,
  });
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingBlocked(true);

      // Load user preferences to get blocked user IDs
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_preferences')
        .select('ignored_users')
        .eq('user_id', user.id)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') throw prefsError;

      const blockedIds = prefsData?.ignored_users || [];

      if (blockedIds.length === 0) {
        setBlockedUsers([]);
        return;
      }

      // Load profiles for blocked users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', blockedIds);

      if (profilesError) throw profilesError;
      setBlockedUsers(profilesData || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoadingBlocked(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'privacy') {
      loadBlockedUsers();
    }
  }, [activeTab, user, loadBlockedUsers]);

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Filter out already blocked users and current user
      const filtered = (data || []).filter(
        (u) => u.id !== user?.id && !blockedUsers.some((b) => b.id === u.id)
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!user) return;

    try {
      // Get current blocked users
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('ignored_users')
        .eq('user_id', user.id)
        .single();

      const currentBlocked = prefsData?.ignored_users || [];
      const updatedBlocked = [...currentBlocked, userId];

      // Update preferences
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ignored_users: updatedBlocked,
        });

      if (error) throw error;

      // Reload blocked users list
      await loadBlockedUsers();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    if (!user || !confirm('Unblock this user?')) return;

    try {
      // Get current blocked users
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('ignored_users')
        .eq('user_id', user.id)
        .single();

      const currentBlocked = prefsData?.ignored_users || [];
      const updatedBlocked = currentBlocked.filter((id: string) => id !== userId);

      // Update preferences
      const { error } = await supabase
        .from('user_preferences')
        .update({ ignored_users: updatedBlocked })
        .eq('user_id', user.id);

      if (error) throw error;

      // Reload blocked users list
      await loadBlockedUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user');
    }
  };

  const loadNotificationPreferences = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingNotifications(true);

      const { data, error } = await supabase
        .from('user_preferences')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.notification_preferences) {
        setNotificationPrefs({
          ...notificationPrefs,
          ...data.notification_preferences,
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user, notificationPrefs]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadNotificationPreferences();
    }
  }, [activeTab, user, loadNotificationPreferences]);

  const saveNotificationPreferences = async () => {
    if (!user) return;

    try {
      setSavingNotifications(true);

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_preferences: notificationPrefs,
        });

      if (error) throw error;

      alert('Notification preferences saved!');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Please sign in to view settings</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> settings
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex space-x-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'profile'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <User className="inline mr-2" size={16} />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'privacy'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Shield className="inline mr-2" size={16} />
          Privacy
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'notifications'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Bell className="inline mr-2" size={16} />
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'appearance'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Palette className="inline mr-2" size={16} />
          Appearance
        </button>
      </div>

      {activeTab === 'profile' && (
        <ShadcnCard>
          <ShadcnCardHeader>
            <h2 className="text-xl font-semibold text-gray-100 font-mono">Profile Information</h2>
          </ShadcnCardHeader>
          <ShadcnCardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Avatar URL
              </label>
              <input
                type="text"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <ShadcnButton
                variant="outline"
                onClick={() => {
                  if (profile) {
                    setFormData({
                      username: profile.username || '',
                      bio: profile.bio || '',
                      avatar_url: profile.avatar_url || '',
                    });
                  }
                }}
              >
                Cancel
              </ShadcnButton>
              <ShadcnButton
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </ShadcnButton>
            </div>
          </ShadcnCardContent>
        </ShadcnCard>
      )}

      {activeTab === 'privacy' && (
        <div className="space-y-6">
          {/* Blocked Users Section */}
          <ShadcnCard>
            <ShadcnCardHeader>
              <h2 className="text-xl font-semibold text-gray-100 font-mono">Blocked Users</h2>
              <p className="text-sm text-gray-400 font-mono mt-2">
                Manage users you've blocked. You won't see their posts or interactions.
              </p>
            </ShadcnCardHeader>
            <ShadcnCardContent className="space-y-4">
              {/* Search for users to block */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  Block a user
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                      placeholder="Search by username..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                    />
                  </div>
                  <ShadcnButton onClick={handleSearchUsers} disabled={searching}>
                    {searching ? <Loader2 className="animate-spin" size={16} /> : 'Search'}
                  </ShadcnButton>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2 bg-gray-800 border border-gray-700 rounded p-4">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-10 h-10 rounded-full border-2 border-terminal-green object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-700 border-2 border-terminal-green rounded-full flex items-center justify-center">
                              <User size={20} className="text-terminal-green" />
                            </div>
                          )}
                          <span className="text-gray-100 font-mono">{user.username}</span>
                        </div>
                        <ShadcnButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleBlockUser(user.id)}
                        >
                          <UserX className="mr-2" size={14} />
                          Block
                        </ShadcnButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Blocked Users List */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 font-mono">
                  Currently Blocked ({blockedUsers.length})
                </h3>

                {loadingBlocked ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-terminal-green" size={32} />
                  </div>
                ) : (blockedUsers.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <UserX size={32} className="text-gray-600 mx-auto" />
                      <p className="text-gray-400 font-mono text-sm">No blocked users</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded p-3 hover:border-terminal-green transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-10 h-10 rounded-full border-2 border-terminal-green object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-700 border-2 border-terminal-green rounded-full flex items-center justify-center">
                              <User size={20} className="text-terminal-green" />
                            </div>
                          )}
                          <span className="text-gray-100 font-mono">{user.username}</span>
                        </div>
                        <ShadcnButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblockUser(user.id)}
                        >
                          Unblock
                        </ShadcnButton>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ShadcnCardContent>
          </ShadcnCard>
        </div>
      )}

      {activeTab === 'notifications' && (
        <ShadcnCard>
          <ShadcnCardHeader>
            <h2 className="text-xl font-semibold text-gray-100 font-mono">Notification Preferences</h2>
            <p className="text-sm text-gray-400 font-mono mt-2">
              Manage how and when you receive notifications
            </p>
          </ShadcnCardHeader>
          <ShadcnCardContent>
            {loadingNotifications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-terminal-green" size={32} />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Email Notifications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-100 font-mono mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300 font-mono block">
                          New Followers
                        </label>
                        <p className="text-xs text-gray-500 font-mono">
                          Get notified when someone follows you
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.emailOnNewFollower}
                          onChange={(e) =>
                            setNotificationPrefs({ ...notificationPrefs, emailOnNewFollower: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-terminal-green rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-terminal-green"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300 font-mono block">
                          Comments on Posts
                        </label>
                        <p className="text-xs text-gray-500 font-mono">
                          Get notified when someone comments on your posts
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.emailOnComment}
                          onChange={(e) =>
                            setNotificationPrefs({ ...notificationPrefs, emailOnComment: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-terminal-green rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-terminal-green"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300 font-mono block">
                          Claps & Reactions
                        </label>
                        <p className="text-xs text-gray-500 font-mono">
                          Get notified when someone claps for your posts
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.emailOnClap}
                          onChange={(e) =>
                            setNotificationPrefs({ ...notificationPrefs, emailOnClap: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-terminal-green rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-terminal-green"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300 font-mono block">
                          Mentions
                        </label>
                        <p className="text-xs text-gray-500 font-mono">
                          Get notified when someone mentions you
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.emailOnMention}
                          onChange={(e) =>
                            setNotificationPrefs({ ...notificationPrefs, emailOnMention: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-terminal-green rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-terminal-green"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300 font-mono block">
                          Weekly Digest
                        </label>
                        <p className="text-xs text-gray-500 font-mono">
                          Receive a weekly summary of your activity
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.emailWeeklyDigest}
                          onChange={(e) =>
                            setNotificationPrefs({ ...notificationPrefs, emailWeeklyDigest: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-terminal-green rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-terminal-green"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-100 font-mono mb-4">Push Notifications</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300 font-mono block">
                        Browser Notifications
                      </label>
                      <p className="text-xs text-gray-500 font-mono">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.pushNotifications}
                        onChange={(e) =>
                          setNotificationPrefs({ ...notificationPrefs, pushNotifications: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-terminal-green rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-terminal-green"></div>
                    </label>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-700">
                  <ShadcnButton onClick={saveNotificationPreferences} disabled={savingNotifications}>
                    {savingNotifications ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Saving...
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                  </ShadcnButton>
                </div>
              </div>
            )}
          </ShadcnCardContent>
        </ShadcnCard>
      )}

      {activeTab === 'appearance' && (
        <ShadcnCard>
          <ShadcnCardHeader>
            <h2 className="text-xl font-semibold text-gray-100 font-mono">Appearance Settings</h2>
            <p className="text-sm text-gray-400 font-mono mt-2">
              Customize your reading experience
            </p>
          </ShadcnCardHeader>
          <ShadcnCardContent className="space-y-6">
            {/* Theme Toggle */}
            <div>
              <h3 className="text-lg font-semibold text-gray-100 font-mono mb-4">Theme</h3>
              <div className="flex items-center space-x-4">
                <ShadcnButton
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => theme === 'light' && toggleTheme()}
                  className="flex-1"
                >
                  <Moon className="mr-2" size={16} />
                  Dark Mode
                </ShadcnButton>
                <ShadcnButton
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className="flex-1"
                >
                  <Sun className="mr-2" size={16} />
                  Light Mode
                </ShadcnButton>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-2">
                Current theme: {theme}
              </p>
            </div>

            {/* Font Size */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100 font-mono mb-4">Reading Font Size</h3>
              <div className="flex items-center space-x-4">
                <ShadcnButton
                  variant={fontSize === 'small' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFontSize('small')}
                >
                  Small
                </ShadcnButton>
                <ShadcnButton
                  variant={fontSize === 'medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFontSize('medium')}
                >
                  Medium
                </ShadcnButton>
                <ShadcnButton
                  variant={fontSize === 'large' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFontSize('large')}
                >
                  Large
                </ShadcnButton>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-2">
                Adjust the font size for better readability
              </p>
            </div>

            {/* Preview */}
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100 font-mono mb-4">Preview</h3>
              <div className="p-4 bg-gray-800 border border-gray-700 rounded">
                <p className="text-gray-100 mb-2" style={{
                  fontSize: fontSize === 'small' ? '14px' : (fontSize === 'large' ? '18px' : '16px')
                }}>
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p className="text-gray-400 text-sm font-mono">
                  This is how your content will appear with the current settings.
                </p>
              </div>
            </div>
          </ShadcnCardContent>
        </ShadcnCard>
      )}
    </div>
  );
}
