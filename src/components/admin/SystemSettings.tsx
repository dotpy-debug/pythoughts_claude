/**
 * System Settings Component
 *
 * Platform-wide configuration management:
 * - Email settings
 * - Security settings
 * - Feature flags
 * - Rate limiting
 * - Maintenance mode
 * - Announcement banners
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSystemSettings, updateSystemSetting } from '../../actions/admin';
import type { SystemSetting } from '../../lib/supabase';
import {
  Settings,
  Mail,
  Shield,
  Flag,
  Zap,
  Loader2,
  Save,
} from 'lucide-react';

export function SystemSettings() {
  const { profile, isAdmin } = useAuth();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, unknown>>({});
  const [activeCategory, setActiveCategory] = useState('system');

  const loadSettings = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await getSystemSettings({ currentUserId: profile.id });
      if (!result.error) {
        setSettings(result.settings);

        // Initialize edited settings
        const initial: Record<string, unknown> = {};
        result.settings.forEach((setting) => {
          initial[setting.key] = setting.value;
        });
        setEditedSettings(initial);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile && isAdmin) {
      loadSettings();
    }
  }, [profile, isAdmin, loadSettings]);

  const handleSaveSetting = async (key: string) => {
    if (!profile) return;

    setSaving(true);
    try {
      const result = await updateSystemSetting({
        currentUserId: profile.id,
        key,
        value: editedSettings[key] as Record<string, unknown>,
      });

      if (result.success) {
        await loadSettings();
      }
    } catch (error) {
      console.error('Error saving setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettingValue = (key: string, field: string, value: unknown) => {
    const currentValue = editedSettings[key];
    const updatedValue = typeof currentValue === 'object' && currentValue !== null
      ? { ...currentValue as Record<string, unknown>, [field]: value }
      : { [field]: value };

    setEditedSettings((prev) => ({
      ...prev,
      [key]: updatedValue,
    }));
  };

  const categories = [
    { id: 'system', label: 'System', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'content', label: 'Content', icon: Flag },
    { id: 'features', label: 'Features', icon: Zap },
  ];

  const filteredSettings = settings.filter(
    (s) => activeCategory === 'all' || s.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Settings className="w-8 h-8 text-orange-500 mr-3" />
            System Settings
          </h1>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Category Sidebar */}
          <div className="col-span-1">
            <nav className="bg-gray-900 border border-gray-800 rounded-lg p-2 space-y-1">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`
                      w-full flex items-center px-3 py-2 rounded-lg transition-colors
                      ${
                        activeCategory === category.id
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{category.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="col-span-3 space-y-6">
            {loading ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                <p className="text-gray-400">Loading settings...</p>
              </div>
            ) : filteredSettings.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center text-gray-400">
                No settings found for this category
              </div>
            ) : (
              filteredSettings.map((setting) => (
                <div
                  key={setting.key}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1 font-mono">
                        {setting.key}
                      </h3>
                      <p className="text-sm text-gray-400">{setting.description}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        setting.is_public
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {setting.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>

                  {/* Setting-specific UI */}
                  <div className="space-y-4">
                    {setting.key === 'maintenance_mode' && (
                      <>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={`${setting.key}_enabled`}
                            checked={(editedSettings[setting.key] as Record<string, unknown> | undefined)?.enabled as boolean || false}
                            onChange={(e) =>
                              updateSettingValue(setting.key, 'enabled', e.target.checked)
                            }
                            className="w-4 h-4"
                          />
                          <label
                            htmlFor={`${setting.key}_enabled`}
                            className="text-gray-200 font-medium"
                          >
                            Enable Maintenance Mode
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">
                            Maintenance Message
                          </label>
                          <textarea
                            value={(editedSettings[setting.key] as Record<string, unknown> | undefined)?.message as string || ''}
                            onChange={(e) =>
                              updateSettingValue(setting.key, 'message', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 resize-none"
                            rows={3}
                            placeholder="We're currently performing maintenance..."
                          />
                        </div>
                      </>
                    )}

                    {setting.key === 'announcement_banner' && (
                      <>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={`${setting.key}_enabled`}
                            checked={(editedSettings[setting.key] as Record<string, unknown> | undefined)?.enabled as boolean || false}
                            onChange={(e) =>
                              updateSettingValue(setting.key, 'enabled', e.target.checked)
                            }
                            className="w-4 h-4"
                          />
                          <label
                            htmlFor={`${setting.key}_enabled`}
                            className="text-gray-200 font-medium"
                          >
                            Show Announcement Banner
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Message</label>
                          <input
                            type="text"
                            value={(editedSettings[setting.key] as Record<string, unknown> | undefined)?.message as string || ''}
                            onChange={(e) =>
                              updateSettingValue(setting.key, 'message', e.target.value)
                            }
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                            placeholder="Important announcement..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Type</label>
                          <select
                            value={(editedSettings[setting.key] as Record<string, unknown> | undefined)?.type as string || 'info'}
                            onChange={(e) =>
                              updateSettingValue(setting.key, 'type', e.target.value)
                            }
                            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                          >
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                            <option value="success">Success</option>
                          </select>
                        </div>
                      </>
                    )}

                    {(setting.key === 'rate_limit_posts' || setting.key === 'rate_limit_comments') && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Limit</label>
                          <input
                            type="number"
                            value={(editedSettings[setting.key] as Record<string, unknown> | undefined)?.limit as number || 10}
                            onChange={(e) =>
                              updateSettingValue(
                                setting.key,
                                'limit',
                                parseInt(e.target.value) || 10
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">
                            Window (seconds)
                          </label>
                          <input
                            type="number"
                            value={(editedSettings[setting.key] as Record<string, unknown> | undefined)?.window as number || 3600}
                            onChange={(e) =>
                              updateSettingValue(
                                setting.key,
                                'window',
                                parseInt(e.target.value) || 3600
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                          />
                        </div>
                      </>
                    )}

                    {(setting.key === 'registration_enabled' ||
                      setting.key === 'email_verification_required') && (
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={setting.key}
                          checked={(editedSettings[setting.key] as Record<string, unknown> | undefined)?.enabled as boolean || false}
                          onChange={(e) =>
                            updateSettingValue(setting.key, 'enabled', e.target.checked)
                          }
                          className="w-4 h-4"
                        />
                        <label htmlFor={setting.key} className="text-gray-200 font-medium">
                          {setting.description}
                        </label>
                      </div>
                    )}

                    {/* Raw JSON Editor for other settings */}
                    {!['maintenance_mode', 'announcement_banner', 'rate_limit_posts', 'rate_limit_comments', 'registration_enabled', 'email_verification_required'].includes(setting.key) && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          JSON Configuration
                        </label>
                        <textarea
                          value={JSON.stringify(editedSettings[setting.key] || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setEditedSettings((prev) => ({
                                ...prev,
                                [setting.key]: parsed,
                              }));
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 font-mono text-sm resize-none"
                          rows={6}
                        />
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
                    <button
                      onClick={() => handleSaveSetting(setting.key)}
                      disabled={saving}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
