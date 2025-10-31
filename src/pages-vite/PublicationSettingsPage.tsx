import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Upload, Users, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Publication, PublicationMember } from '../lib/supabase';
import { ShadcnCard, ShadcnCardHeader, ShadcnCardContent } from '../components/ui/ShadcnCard';
import { ShadcnButton } from '../components/ui/ShadcnButton';
import { sanitizeInput } from '../utils/security';

export function PublicationSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [members, setMembers] = useState<PublicationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>('general');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    logo_url: '',
    cover_image_url: '',
    is_public: true,
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'writer'>('writer');

  const loadPublication = useCallback(async () => {
    if (!slug || !user) return;

    try {
      setLoading(true);

      // Load publication
      const { data: pubData, error: pubError } = await supabase
        .from('publications')
        .select('*')
        .eq('slug', slug)
        .single();

      if (pubError) throw pubError;

      // Check if user is owner
      if (pubData.owner_id !== user.id) {
        navigate(`/publication/${slug}`);
        return;
      }

      setPublication(pubData);
      setFormData({
        name: pubData.name,
        description: pubData.description,
        slug: pubData.slug,
        logo_url: pubData.logo_url,
        cover_image_url: pubData.cover_image_url,
        is_public: pubData.is_public,
      });

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from('publication_members')
        .select(`
          *,
          profiles (username, avatar_url, email)
        `)
        .eq('publication_id', pubData.id);

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error) {
      console.error('Error loading publication:', error);
      navigate('/publications');
    } finally {
      setLoading(false);
    }
  }, [slug, user, navigate]);

  useEffect(() => {
    loadPublication();
  }, [loadPublication]);

  const handleSave = async () => {
    if (!publication) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('publications')
        .update({
          name: sanitizeInput(formData.name),
          description: sanitizeInput(formData.description),
          slug: sanitizeInput(formData.slug),
          logo_url: formData.logo_url,
          cover_image_url: formData.cover_image_url,
          is_public: formData.is_public,
        })
        .eq('id', publication.id);

      if (error) throw error;

      alert('Publication updated successfully!');
      navigate(`/publication/${formData.slug}`);
    } catch (error) {
      console.error('Error updating publication:', error);
      alert('Failed to update publication');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!publication || !inviteEmail) return;

    try {
      // TODO: Implement proper invite system with email
      alert('Invite functionality will send an email invitation');
      setInviteEmail('');
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('Failed to invite member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!publication) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase
        .from('publication_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.filter(m => m.id !== memberId));
      alert('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'owner' | 'editor' | 'writer') => {
    if (!publication) return;

    try {
      const { error } = await supabase
        .from('publication_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      alert('Member role updated successfully');
    } catch (error) {
      console.error('Error updating member role:', error);
      alert('Failed to update member role');
    }
  };

  const handleDeletePublication = async () => {
    if (!publication) return;
    if (!confirm('Are you sure you want to delete this publication? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('publications')
        .delete()
        .eq('id', publication.id);

      if (error) throw error;

      navigate('/publications');
    } catch (error) {
      console.error('Error deleting publication:', error);
      alert('Failed to delete publication');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  if (!publication) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> publication_settings
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          Manage {publication.name}
        </p>
      </div>

      <div className="flex space-x-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'general'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <SettingsIcon className="inline mr-2" size={16} />
          General
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'members'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Users className="inline mr-2" size={16} />
          Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'danger'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Trash2 className="inline mr-2" size={16} />
          Danger Zone
        </button>
      </div>

      {activeTab === 'general' && (
        <ShadcnCard>
          <ShadcnCardHeader>
            <h2 className="text-xl font-semibold text-gray-100 font-mono">General Settings</h2>
          </ShadcnCardHeader>
          <ShadcnCardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Publication Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Logo URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-terminal-green hover:border-terminal-green transition-colors"
                >
                  <Upload size={20} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                Cover Image URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-terminal-green hover:border-terminal-green transition-colors"
                >
                  <Upload size={20} />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4 bg-gray-800 border-gray-700 rounded focus:ring-terminal-green"
              />
              <label htmlFor="is_public" className="text-sm text-gray-300 font-mono">
                Make this publication public
              </label>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-800">
              <ShadcnButton
                variant="outline"
                onClick={() => navigate(`/publication/${publication.slug}`)}
              >
                Cancel
              </ShadcnButton>
              <ShadcnButton onClick={handleSave} disabled={saving}>
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

      {activeTab === 'members' && (
        <ShadcnCard>
          <ShadcnCardHeader>
            <h2 className="text-xl font-semibold text-gray-100 font-mono">Member Management</h2>
          </ShadcnCardHeader>
          <ShadcnCardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-300 font-mono">Invite New Member</h3>
              <div className="flex space-x-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'writer')}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                >
                  <option value="writer">Writer</option>
                  <option value="editor">Editor</option>
                </select>
                <ShadcnButton onClick={handleInviteMember} disabled={!inviteEmail}>
                  Invite
                </ShadcnButton>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-300 font-mono">Current Members</h3>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded"
                >
                  <div className="flex items-center space-x-3">
                    {(member.profiles as { avatar_url?: string } | null)?.avatar_url ? (
                      <img
                        src={(member.profiles as { avatar_url?: string } | null)?.avatar_url || ''}
                        alt={(member.profiles as { username?: string } | null)?.username || 'User'}
                        className="w-10 h-10 rounded-full border border-terminal-green object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-700 border border-terminal-green rounded-full flex items-center justify-center">
                        <Users size={16} className="text-terminal-green" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-100">
                        {(member.profiles as { username?: string } | null)?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{member.role}</p>
                    </div>
                  </div>

                  {member.user_id !== user?.id && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.id, e.target.value as 'owner' | 'editor' | 'writer')}
                        className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
                      >
                        <option value="writer">Writer</option>
                        <option value="editor">Editor</option>
                        <option value="owner">Owner</option>
                      </select>
                      <ShadcnButton
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove
                      </ShadcnButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ShadcnCardContent>
        </ShadcnCard>
      )}

      {activeTab === 'danger' && (
        <ShadcnCard>
          <ShadcnCardHeader>
            <h2 className="text-xl font-semibold text-red-500 font-mono">Danger Zone</h2>
          </ShadcnCardHeader>
          <ShadcnCardContent className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
              <h3 className="text-sm font-semibold text-red-500 mb-2 font-mono">
                Delete Publication
              </h3>
              <p className="text-sm text-gray-400 mb-4 font-mono">
                Once you delete a publication, there is no going back. Please be certain.
              </p>
              <ShadcnButton
                variant="destructive"
                onClick={handleDeletePublication}
              >
                <Trash2 className="mr-2" size={16} />
                Delete Publication
              </ShadcnButton>
            </div>
          </ShadcnCardContent>
        </ShadcnCard>
      )}
    </div>
  );
}
