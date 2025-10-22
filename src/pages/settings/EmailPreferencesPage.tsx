/**
 * Email Preferences Page
 *
 * Allow users to manage their email notification preferences
 * Features:
 * - Toggle email notifications on/off
 * - Configure notification types
 * - Set digest email frequency
 * - Test email delivery
 */

import { useState, useEffect } from 'react';
import { Mail, Bell, Clock, Check, X, Send } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface EmailPreferences {
  emailNotificationsEnabled: boolean;
  postReplies: boolean;
  commentReplies: boolean;
  votes: boolean;
  mentions: boolean;
  taskAssignments: boolean;
  weeklyDigest: boolean;
  digestDay: number; // 0-6 (Sunday-Saturday)
}

const DEFAULT_PREFERENCES: EmailPreferences = {
  emailNotificationsEnabled: true,
  postReplies: true,
  commentReplies: true,
  votes: false,
  mentions: true,
  taskAssignments: true,
  weeklyDigest: true,
  digestDay: 1, // Monday
};

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function EmailPreferencesPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSent, setTestingSent] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load preferences
  useEffect(() => {
    if (!user) return;

    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        throw error;
      }

      if (data) {
        setPreferences({
          emailNotificationsEnabled: data.email_enabled ?? true,
          postReplies: data.post_reply ?? true,
          commentReplies: data.comment_reply ?? true,
          votes: data.vote ?? false,
          mentions: data.mention ?? true,
          taskAssignments: data.task_assigned ?? true,
          weeklyDigest: data.weekly_digest ?? true,
          digestDay: data.digest_day ?? 1,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      showMessage('error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          email_enabled: preferences.emailNotificationsEnabled,
          post_reply: preferences.postReplies,
          comment_reply: preferences.commentReplies,
          vote: preferences.votes,
          mention: preferences.mentions,
          task_assigned: preferences.taskAssignments,
          weekly_digest: preferences.weeklyDigest,
          digest_day: preferences.digestDay,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      showMessage('success', 'Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showMessage('error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!user) return;

    try {
      setTestingSent(true);

      // Call server action to send test email
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      showMessage('success', 'Test email sent! Check your inbox.');
    } catch (error) {
      console.error('Error sending test email:', error);
      showMessage('error', 'Failed to send test email');
    } finally {
      setTimeout(() => setTestingSent(false), 3000);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const togglePreference = (key: keyof EmailPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setDigestDay = (day: number) => {
    setPreferences((prev) => ({
      ...prev,
      digestDay: day,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-terminal-green font-mono">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail size={32} className="text-terminal-green" />
            <h1 className="text-3xl font-bold text-terminal-green font-mono">
              Email Preferences
            </h1>
          </div>
          <p className="text-gray-400 font-mono">
            Manage your email notification settings
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={cn(
              'mb-6 p-4 rounded-lg border font-mono flex items-center gap-3',
              message.type === 'success'
                ? 'bg-green-900/20 border-green-500 text-green-400'
                : 'bg-red-900/20 border-red-500 text-red-400'
            )}
          >
            {message.type === 'success' ? <Check size={20} /> : <X size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Master Toggle */}
        <div className="bg-gray-800 border-2 border-terminal-green rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-terminal-green font-mono mb-1">
                Email Notifications
              </h2>
              <p className="text-gray-400 text-sm font-mono">
                Enable or disable all email notifications
              </p>
            </div>
            <button
              onClick={() => togglePreference('emailNotificationsEnabled')}
              className={cn(
                'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                preferences.emailNotificationsEnabled
                  ? 'bg-terminal-green'
                  : 'bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-6 w-6 transform rounded-full bg-gray-900 transition-transform',
                  preferences.emailNotificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>

        {/* Notification Types */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-terminal-green font-mono mb-4 flex items-center gap-2">
            <Bell size={20} />
            Notification Types
          </h2>

          <div className="space-y-4">
            <NotificationToggle
              label="Post Replies"
              description="When someone replies to your post"
              enabled={preferences.postReplies && preferences.emailNotificationsEnabled}
              disabled={!preferences.emailNotificationsEnabled}
              onToggle={() => togglePreference('postReplies')}
            />

            <NotificationToggle
              label="Comment Replies"
              description="When someone replies to your comment"
              enabled={preferences.commentReplies && preferences.emailNotificationsEnabled}
              disabled={!preferences.emailNotificationsEnabled}
              onToggle={() => togglePreference('commentReplies')}
            />

            <NotificationToggle
              label="Votes"
              description="When your posts reach vote milestones"
              enabled={preferences.votes && preferences.emailNotificationsEnabled}
              disabled={!preferences.emailNotificationsEnabled}
              onToggle={() => togglePreference('votes')}
            />

            <NotificationToggle
              label="Mentions"
              description="When someone mentions you in a post or comment"
              enabled={preferences.mentions && preferences.emailNotificationsEnabled}
              disabled={!preferences.emailNotificationsEnabled}
              onToggle={() => togglePreference('mentions')}
            />

            <NotificationToggle
              label="Task Assignments"
              description="When you're assigned a new task"
              enabled={preferences.taskAssignments && preferences.emailNotificationsEnabled}
              disabled={!preferences.emailNotificationsEnabled}
              onToggle={() => togglePreference('taskAssignments')}
            />
          </div>
        </div>

        {/* Weekly Digest */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-terminal-green font-mono mb-4 flex items-center gap-2">
            <Clock size={20} />
            Weekly Digest
          </h2>

          <div className="space-y-4">
            <NotificationToggle
              label="Weekly Digest"
              description="Receive a weekly summary of your activity and trending posts"
              enabled={preferences.weeklyDigest && preferences.emailNotificationsEnabled}
              disabled={!preferences.emailNotificationsEnabled}
              onToggle={() => togglePreference('weeklyDigest')}
            />

            {preferences.weeklyDigest && preferences.emailNotificationsEnabled && (
              <div className="pl-12">
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Send digest on:
                </label>
                <select
                  value={preferences.digestDay}
                  onChange={(e) => setDigestDay(Number(e.target.value))}
                  className="w-full max-w-xs px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-terminal-green font-mono focus:outline-none focus:border-terminal-green"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Test Email */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-terminal-green font-mono mb-2">
            Test Email Delivery
          </h2>
          <p className="text-gray-400 text-sm font-mono mb-4">
            Send a test email to {user?.email} to verify your email settings
          </p>
          <button
            onClick={sendTestEmail}
            disabled={testingSent || !preferences.emailNotificationsEnabled}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono transition-all duration-200',
              testingSent || !preferences.emailNotificationsEnabled
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-terminal-green text-gray-900 hover:bg-terminal-blue font-bold'
            )}
          >
            <Send size={16} />
            {testingSent ? 'Test Email Sent!' : 'Send Test Email'}
          </button>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={loadPreferences}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-mono transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-terminal-green text-gray-900 hover:bg-terminal-blue font-bold font-mono transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification Toggle Component
interface NotificationToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

function NotificationToggle({
  label,
  description,
  enabled,
  disabled = false,
  onToggle,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 border border-gray-700 rounded-lg">
      <div className="flex-1">
        <h3 className="text-terminal-green font-mono font-bold mb-1">{label}</h3>
        <p className="text-gray-400 text-sm font-mono">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && enabled && 'bg-terminal-green',
          !disabled && !enabled && 'bg-gray-700'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-gray-900 transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

export default EmailPreferencesPage;
