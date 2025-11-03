import { useState } from 'react';
import { Terminal, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShadcnButton } from '../ui/ShadcnButton';

type ReportModalProperties = {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'post' | 'comment';
  contentId: string;
  reportedUserId?: string;
};

type ReportCategory = 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other';

const reportCategories: { value: ReportCategory; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Repetitive, unsolicited, or promotional content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or abusive behavior' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'NSFW, offensive, or harmful material' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'other', label: 'Other', description: 'Other violation of community guidelines' },
];

export function ReportModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  reportedUserId,
}: ReportModalProperties) {
  const { user } = useAuth();
  const [category, setCategory] = useState<ReportCategory>('spam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setSubmitting(true);

    try {
      const selectedCategory = reportCategories.find(c => c.value === category);

      const reportData: Record<string, unknown> = {
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        reason: selectedCategory?.label || category,
        category,
        description: description.trim() || null,
        status: 'pending',
      };

      if (contentType === 'post') {
        reportData.post_id = contentId;
      } else {
        reportData.comment_id = contentId;
      }

      const { error: insertError } = await supabase.from('reports').insert(reportData);

      if (insertError) throw insertError;

      setSuccess(true);
      setDescription('');

      // Close modal after short delay
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setDescription('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-lg w-full animate-slide-up">
        {/* Terminal Window Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer" onClick={handleClose} />
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer" />
          </div>
          <div className="flex items-center space-x-2">
            <Terminal size={14} className="text-gray-500" />
            <span className="text-gray-100 font-mono text-sm">report_content.sh</span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-terminal-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-terminal-green" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-100 font-mono mb-2">Report Submitted</h3>
            <p className="text-gray-400 font-mono text-sm">
              Thank you for helping keep our community safe. We'll review this report shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="flex items-start space-x-3 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded">
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-gray-100 font-mono mb-1">
                  Report {contentType}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  False reports may result in account restrictions
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-300 mb-3">
                <span className="text-terminal-green">$ </span>Why are you reporting this {contentType}?
              </label>
              <div className="space-y-2">
                {reportCategories.map((cat) => (
                  <label
                    key={cat.value}
                    className={`flex items-start space-x-3 p-3 border rounded cursor-pointer transition-all ${
                      category === cat.value
                        ? 'bg-terminal-green/10 border-terminal-green'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={category === cat.value}
                      onChange={(e) => setCategory(e.target.value as ReportCategory)}
                      className="mt-1 text-terminal-green focus:ring-terminal-green"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-100 font-mono">{cat.label}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{cat.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-300 mb-1.5">
                <span className="text-terminal-green">$ </span>Additional details (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none font-mono resize-none placeholder:text-gray-500"
                placeholder="Provide any additional context that would help us review this report..."
              />
              <p className="text-xs text-gray-500 font-mono mt-1">
                {description.length} / 500 characters
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm font-mono">
                <span className="text-red-500">! </span>{error}
              </div>
            )}

            <div className="flex items-center space-x-3 pt-4 border-t border-gray-700">
              <ShadcnButton
                type="submit"
                disabled={submitting}
                variant="default"
                className="flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </ShadcnButton>
              <ShadcnButton
                type="button"
                onClick={handleClose}
                variant="outline"
                disabled={submitting}
              >
                Cancel
              </ShadcnButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
