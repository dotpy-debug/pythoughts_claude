/**
 * Comment Edit Form Component
 *
 * Form for editing existing comments
 * Features:
 * - Pre-filled with current content
 * - Character limit validation
 * - Content safety checking
 * - Cancel/Save actions
 * - Loading states
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MentionsInput } from '../mentions/MentionsInput';
import { isValidContentLength, sanitizeInput } from '../../utils/security';
import { checkContentSafety, shouldAutoBlock } from '../../utils/contentFilter';

export interface CommentEditFormProps {
  /**
   * Current comment content
   */
  initialContent: string;

  /**
   * Submit handler
   */
  onSubmit: (content: string) => Promise<void>;

  /**
   * Cancel handler
   */
  onCancel: () => void;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * CommentEditForm Component
 *
 * @example
 * ```tsx
 * <CommentEditForm
 *   initialContent="Original comment text"
 *   onSubmit={handleUpdate}
 *   onCancel={() => setEditing(false)}
 * />
 * ```
 */
export function CommentEditForm({
  initialContent,
  onSubmit,
  onCancel,
  className,
}: CommentEditFormProps) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset content if initial content changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Sanitize and validate
    const sanitized = sanitizeInput(content.trim());

    if (!isValidContentLength(sanitized, 1, 1000)) {
      setError('Comment must be between 1 and 1000 characters');
      return;
    }

    // Check content safety
    const safetyCheck = checkContentSafety(sanitized);

    if (shouldAutoBlock(sanitized)) {
      setError(
        `Content blocked: ${safetyCheck.issues.join(', ')}. Please revise your comment.`
      );
      return;
    }

    try {
      setLoading(true);
      await onSubmit(sanitized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl/Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as React.FormEvent<HTMLFormElement>);
    }

    // Cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > 1000;
  const isUnchanged = content.trim() === initialContent.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-2', className)}
    >
      <MentionsInput
        value={content}
        onChange={setContent}
        onKeyDown={handleKeyDown}
        placeholder="Edit your comment..."
        className="w-full min-h-[80px] px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-terminal-green resize-y"
        autoFocus
      />

      {/* Character Counter */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span
          className={cn(
            'transition-colors',
            isOverLimit
              ? 'text-red-500 font-bold'
              : characterCount > 900
                ? 'text-yellow-500'
                : 'text-gray-500'
          )}
        >
          {characterCount}/1000
        </span>

        <span className="text-gray-600">
          Ctrl+Enter to save, Esc to cancel
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || isOverLimit || !content.trim() || isUnchanged}
          className={cn(
            'px-4 py-2 rounded-lg font-mono text-sm transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isUnchanged
              ? 'bg-gray-700 text-gray-400'
              : 'bg-terminal-green text-gray-900 hover:bg-terminal-blue font-bold hover:scale-105 active:scale-95'
          )}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 font-mono text-sm transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default CommentEditForm;
