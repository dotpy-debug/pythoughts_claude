import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Series } from '../lib/supabase';
import { ShadcnCard, ShadcnCardHeader, ShadcnCardContent } from '../components/ui/ShadcnCard';
import { ShadcnButton } from '../components/ui/ShadcnButton';
import { sanitizeInput } from '../utils/security';

export function SeriesEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    cover_image_url: '',
    is_published: false,
  });

  const loadSeries = useCallback(async () => {
    if (!slug || !user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;

      if (data.author_id !== user.id) {
        navigate(`/series/${slug}`);
        return;
      }

      setSeries(data);
      setFormData({
        name: data.name,
        description: data.description,
        slug: data.slug,
        cover_image_url: data.cover_image_url,
        is_published: data.is_published,
      });
    } catch (error) {
      console.error('Error loading series:', error);
      navigate('/series');
    } finally {
      setLoading(false);
    }
  }, [slug, user, navigate]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const handleSave = async () => {
    if (!series) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('series')
        .update({
          name: sanitizeInput(formData.name),
          description: sanitizeInput(formData.description),
          slug: sanitizeInput(formData.slug),
          cover_image_url: formData.cover_image_url,
          is_published: formData.is_published,
        })
        .eq('id', series.id);

      if (error) throw error;

      alert('Series updated successfully!');
      navigate(`/series/${formData.slug}`);
    } catch (error) {
      console.error('Error updating series:', error);
      alert('Failed to update series');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!series) return;
    if (!confirm('Are you sure you want to delete this series? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('series')
        .delete()
        .eq('id', series.id);

      if (error) throw error;

      navigate('/series');
    } catch (error) {
      console.error('Error deleting series:', error);
      alert('Failed to delete series');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  if (!series) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> edit_series
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          Edit {series.name}
        </p>
      </div>

      <ShadcnCard>
        <ShadcnCardHeader>
          <h2 className="text-xl font-semibold text-gray-100 font-mono">Series Settings</h2>
        </ShadcnCardHeader>
        <ShadcnCardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              Series Name
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
              Cover Image URL
            </label>
            <input
              type="url"
              value={formData.cover_image_url}
              onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="w-4 h-4 bg-gray-800 border-gray-700 rounded focus:ring-terminal-green"
            />
            <label htmlFor="is_published" className="text-sm text-gray-300 font-mono">
              Publish series
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-gray-800">
            <ShadcnButton
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2" size={16} />
              Delete Series
            </ShadcnButton>

            <div className="flex space-x-4">
              <ShadcnButton
                variant="outline"
                onClick={() => navigate(`/series/${series.slug}`)}
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
                  <>
                    <Save className="mr-2" size={16} />
                    Save Changes
                  </>
                )}
              </ShadcnButton>
            </div>
          </div>
        </ShadcnCardContent>
      </ShadcnCard>
    </div>
  );
}
