import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShadcnButton } from '../ui/ShadcnButton';
import { X, Loader2, Upload } from 'lucide-react';
import { sanitizeInput } from '../../utils/security';

type CreatePublicationModalProperties = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreatePublicationModal({ isOpen, onClose, onSuccess }: CreatePublicationModalProperties) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    logo_url: '',
    cover_image_url: '',
    is_public: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // Generate slug from name if not provided
      const slug = formData.slug || formData.name.toLowerCase().replaceAll(/\s+/g, '-').replaceAll(/[^a-z0-9-]/g, '');

      // Sanitize inputs
      const sanitizedData = {
        name: sanitizeInput(formData.name),
        description: sanitizeInput(formData.description),
        slug: sanitizeInput(slug),
        logo_url: formData.logo_url,
        cover_image_url: formData.cover_image_url,
        owner_id: user.id,
        is_public: formData.is_public,
      };

      // Create publication
      const { data: publication, error: pubError } = await supabase
        .from('publications')
        .insert(sanitizedData)
        .select()
        .single();

      if (pubError) throw pubError;

      // Add owner as a member
      const { error: memberError } = await supabase
        .from('publication_members')
        .insert({
          publication_id: publication.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // Reset form
      setFormData({
        name: '',
        description: '',
        slug: '',
        logo_url: '',
        cover_image_url: '',
        is_public: true,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating publication:', error);
      alert('Failed to create publication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> create_publication
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              Publication Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
              placeholder="My Awesome Publication"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green resize-none"
              placeholder="A brief description of your publication..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              Slug (URL identifier)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100 font-mono focus:outline-none focus:border-terminal-green"
              placeholder="my-publication (auto-generated if empty)"
            />
            <p className="text-xs text-gray-500 mt-1 font-mono">
              Will be auto-generated from name if left empty
            </p>
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
                placeholder="https://example.com/logo.png"
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
                placeholder="https://example.com/cover.png"
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

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
            <ShadcnButton
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </ShadcnButton>
            <ShadcnButton
              type="submit"
              disabled={loading || !formData.name || !formData.description}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Creating...
                </>
              ) : (
                'Create Publication'
              )}
            </ShadcnButton>
          </div>
        </form>
      </div>
    </div>
  );
}
