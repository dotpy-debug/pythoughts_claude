/**
 * Comments Panel Component
 *
 * Displays threaded comments for blog posts:
 * - Comment list with threading
 * - Reply functionality
 * - Comment form
 * - Loading states
 */

import { useState, useEffect } from 'react';
import { MessageCircle, Send, Reply } from 'lucide-react';
import { BlogComment } from '../../../types/blog';
import { Avatar, AvatarImage, AvatarFallback } from '../../ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface CommentsPanelProps {
  postId: string;
  className?: string;
}

export function CommentsPanel({ postId, className }: CommentsPanelProps) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      // TODO: Fetch comments from API
      // const data = await getComments(postId);
      // setComments(data);
      setComments([]); // Placeholder
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (
    content: string,
    parentId?: string
  ) => {
    if (!content.trim()) return;

    try {
      // TODO: Submit comment to API
      // const newComment = await createComment(postId, content, parentId);
      // setComments([...comments, newComment]);

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const renderComment = (comment: BlogComment, depth: number = 0) => {
    const isReplying = replyingTo === comment.id;

    return (
      <div
        key={comment.id}
        className={`
          ${depth > 0 ? 'ml-8 border-l-2 border-white/10 pl-4' : ''}
          mb-4
        `}
      >
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 mt-1">
            <AvatarImage
              src={comment.user?.avatar_url}
              alt={comment.user?.username}
            />
            <AvatarFallback className="bg-[#27C93F]/20 text-[#27C93F]">
              {comment.user?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-[#E6EDF3]">
                {comment.user?.username || 'Anonymous'}
              </span>
              <span className="text-xs text-[#E6EDF3]/60">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                })}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-[#E6EDF3]/40 italic">
                  (edited)
                </span>
              )}
            </div>

            <p className="text-sm text-[#E6EDF3]/80 mb-2 leading-relaxed">
              {comment.content}
            </p>

            <button
              onClick={() => setReplyingTo(comment.id)}
              className="flex items-center gap-1 text-xs text-[#27C93F] hover:text-[#27C93F]/80 transition-colors"
            >
              <Reply size={12} />
              Reply
            </button>

            {isReplying && (
              <div className="mt-3">
                <CommentForm
                  placeholder={`Reply to ${comment.user?.username}...`}
                  onSubmit={(content) =>
                    handleSubmitComment(content, comment.id)
                  }
                  onCancel={() => setReplyingTo(null)}
                  autoFocus
                />
              </div>
            )}

            {/* Render replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4">
                {comment.replies.map((reply) =>
                  renderComment(reply, depth + 1)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className={`mt-12 ${className || ''}`}>
      <div className="bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle size={20} className="text-[#27C93F]" />
          <h2 className="text-2xl font-bold text-[#E6EDF3]">
            Comments ({comments.length})
          </h2>
        </div>

        {/* Comment Form */}
        <div className="mb-8">
          <CommentForm
            placeholder="Share your thoughts..."
            onSubmit={handleSubmitComment}
          />
        </div>

        {/* Comments List */}
        {isLoading ? (
          <div className="text-center text-[#E6EDF3]/60 py-8">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-[#E6EDF3]/60 py-8">
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          <div className="space-y-4">
            {comments
              .filter((c) => !c.parent_id)
              .map((comment) => renderComment(comment))}
          </div>
        )}
      </div>
    </section>
  );
}

interface CommentFormProps {
  placeholder: string;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

function CommentForm({
  placeholder,
  onSubmit,
  onCancel,
  autoFocus,
}: CommentFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 px-4 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-[#E6EDF3] placeholder:text-[#E6EDF3]/40 focus:outline-none focus:ring-2 focus:ring-[#27C93F] focus:border-transparent"
      />
      <button
        type="submit"
        disabled={!content.trim()}
        className="px-4 py-2 bg-[#27C93F] text-[#0d1117] rounded-lg font-medium hover:bg-[#27C93F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Send size={16} />
        <span className="hidden sm:inline">Send</span>
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white/5 text-[#E6EDF3] rounded-lg font-medium hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
