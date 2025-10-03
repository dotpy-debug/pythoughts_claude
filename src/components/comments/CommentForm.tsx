import { useState } from 'react';
import { isValidContentLength } from '../../utils/security';

type CommentFormProps = {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
};

export function CommentForm({ onSubmit, onCancel, placeholder = 'Write a comment...' }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setError('');

    // Validate content length (min 1, max 1000 chars)
    if (!isValidContentLength(content, 1, 1000)) {
      setError('Comment must be between 1 and 1,000 characters');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
      setError('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`w-full px-3 py-2 border ${
          error ? 'border-red-500' : 'border-gray-700'
        } bg-gray-800 text-gray-100 rounded focus:ring-2 focus:ring-terminal-green focus:border-transparent resize-none font-mono placeholder:text-gray-500`}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="bg-terminal-green text-gray-900 px-4 py-1.5 rounded text-sm font-mono font-semibold hover:bg-terminal-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'posting...' : 'post'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 px-4 py-1.5 rounded text-sm font-mono hover:bg-gray-800 transition-colors"
            >
              cancel
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 font-mono">
            {content.length} / 1000
          </span>
          {error && (
            <span className="text-xs text-red-400 font-mono">
              <span className="text-red-500">! </span>{error}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
