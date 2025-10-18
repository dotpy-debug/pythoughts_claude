import { useState, useEffect } from 'react';
import { Loader2, User, Bell, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ShadcnCard, ShadcnCardHeader, ShadcnCardContent } from '../components/ui/ShadcnCard';
import { ShadcnButton } from '../components/ui/ShadcnButton';

export function SettingsPage() {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'appearance'>('profile');

  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

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

      {activeTab === 'notifications' && (
        <ShadcnCard>
          <ShadcnCardHeader>
            <h2 className="text-xl font-semibold text-gray-100 font-mono">Notification Preferences</h2>
          </ShadcnCardHeader>
          <ShadcnCardContent>
            <p className="text-gray-400 font-mono">Notification settings coming soon...</p>
          </ShadcnCardContent>
        </ShadcnCard>
      )}

      {activeTab === 'appearance' && (
        <ShadcnCard>
          <ShadcnCardHeader>
            <h2 className="text-xl font-semibold text-gray-100 font-mono">Appearance Settings</h2>
          </ShadcnCardHeader>
          <ShadcnCardContent>
            <p className="text-gray-400 font-mono">Theme and appearance settings coming soon...</p>
          </ShadcnCardContent>
        </ShadcnCard>
      )}
    </div>
  );
}
