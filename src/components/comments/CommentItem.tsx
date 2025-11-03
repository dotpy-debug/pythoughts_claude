import { useState, memo } from 'react';
import { ArrowUp, ArrowDown, MessageCircle, User, ChevronDown, ChevronUp, Flag, Pin, Edit2 } from 'lucide-react';
import { Comment, supabase } from '../../lib/supabase';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { CommentForm } from './CommentForm';
import { CommentEditForm } from './CommentEditForm';
import { CommentReactions } from './CommentReactions';
import { sanitizeURL } from '../../utils/security';
import { ReportModal } from '../moderation/ReportModal';
import { useAuth } from '../../contexts/AuthContext';

type CommentItemProperties = {
  comment: Comment;
  userVote?: 1 | -1 | null;
  onVote: (commentId: string, voteType: 1 | -1) => void;
  onReply: (parentId: string, content: string) => Promise<void>;
  onPinToggle?: () => void;
  postAuthorId?: string;
  depth: number;
};

export const CommentItem = memo(function CommentItem({ comment, userVote, onVote, onReply, onPinToggle, postAuthorId, depth }: CommentItemProperties) {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const isPostAuthor = user && postAuthorId && user.id === postAuthorId;
  const isCommentAuthor = user && user.id === comment.author_id;

  const handleVote = (voteType: 1 | -1) => {
    onVote(comment.id, voteType);
  };

  const handleReply = async (content: string) => {
    await onReply(comment.id, content);
    setShowReplyForm(false);
  };

  const handleReport = () => {
    setReportModalOpen(true);
  };

  const handlePinToggle = async () => {
    if (!isPostAuthor || isPinning) return;

    setIsPinning(true);
    try {
      const { error } = await supabase
        .from('comments')
        .update({ is_pinned: !comment.is_pinned })
        .eq('id', comment.id);

      if (error) throw error;

      if (onPinToggle) {
        onPinToggle();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    } finally {
      setIsPinning(false);
    }
  };

  const handleEdit = async (newContent: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', comment.id);

      if (error) throw error;

      // Update local comment object
      comment.content = newContent;
      comment.updated_at = new Date().toISOString();

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  const marginLeft = Math.min(depth * 24, 96);

  if (comment.is_deleted) {
    return (
      <div style={{ marginLeft: `${marginLeft}px` }} className="py-2">
        <div className="text-gray-600 italic text-sm font-mono">[deleted]</div>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: `${marginLeft}px` }} className="border-l-2 border-gray-700 pl-4 py-2">
      <div className="flex items-start space-x-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex-shrink-0 mt-1 text-gray-600 hover:text-terminal-green transition-colors"
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {comment.profiles?.avatar_url ? (
              <img
                src={sanitizeURL(comment.profiles.avatar_url)}
                alt={comment.profiles.username}
                className="w-5 h-5 rounded-full object-cover border border-terminal-purple"
              />
            ) : (
              <div className="w-5 h-5 bg-gray-800 border border-terminal-purple rounded-full flex items-center justify-center">
                <User size={10} className="text-terminal-purple" />
              </div>
            )}
            <span className="text-sm font-mono text-terminal-blue">
              {comment.profiles?.username || 'anonymous'}
            </span>
            {comment.is_pinned && (
              <span className="flex items-center space-x-1 text-xs bg-terminal-purple/20 text-terminal-purple px-2 py-0.5 rounded font-mono border border-terminal-purple/30">
                <Pin size={10} />
                <span>Pinned</span>
              </span>
            )}
            <span className="text-xs text-gray-600 font-mono">
              {formatDistanceToNow(comment.created_at)}
            </span>
          </div>

          {!isCollapsed && (
            <>
              {/* Comment Content or Edit Form */}
              {isEditing ? (
                <div className="mb-2">
                  <CommentEditForm
                    initialContent={comment.content}
                    onSubmit={handleEdit}
                    onCancel={() => setIsEditing(false)}
                  />
                </div>
              ) : (
                <p className="text-gray-300 text-sm mb-2 font-mono">{comment.content}</p>
              )}

              <div className="flex items-center space-x-4 text-xs font-mono">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleVote(1)}
                    className={`p-1 rounded hover:bg-gray-800 transition-colors ${
                      userVote === 1 ? 'text-terminal-green' : 'text-gray-500'
                    }`}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <span className={`font-medium ${
                    userVote === 1 ? 'text-terminal-green' : (userVote === -1 ? 'text-terminal-pink' : 'text-gray-500')
                  }`}>
                    {comment.vote_count}
                  </span>
                  <button
                    onClick={() => handleVote(-1)}
                    className={`p-1 rounded hover:bg-gray-800 transition-colors ${
                      userVote === -1 ? 'text-terminal-pink' : 'text-gray-500'
                    }`}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-terminal-blue transition-colors"
                >
                  <MessageCircle size={14} />
                  <span>reply</span>
                </button>

                {isCommentAuthor && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-terminal-green transition-colors"
                    title="Edit comment"
                  >
                    <Edit2 size={14} />
                    <span>edit</span>
                  </button>
                )}

                {isPostAuthor && (
                  <button
                    onClick={handlePinToggle}
                    disabled={isPinning}
                    className={`flex items-center space-x-1 transition-colors disabled:opacity-50 ${
                      comment.is_pinned
                        ? 'text-terminal-purple hover:text-terminal-pink'
                        : 'text-gray-500 hover:text-terminal-purple'
                    }`}
                    title={comment.is_pinned ? 'Unpin comment' : 'Pin comment'}
                  >
                    <Pin size={14} />
                    <span>{comment.is_pinned ? 'unpin' : 'pin'}</span>
                  </button>
                )}

                <button
                  onClick={handleReport}
                  className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors"
                  title="Report comment"
                >
                  <Flag size={14} />
                </button>
              </div>

              {/* Comment Reactions */}
              <div className="mt-2">
                <CommentReactions
                  commentId={comment.id}
                  reactionCounts={comment.reaction_counts || {}}
                />
              </div>

              {showReplyForm && (
                <div className="mt-3">
                  <CommentForm
                    onSubmit={handleReply}
                    onCancel={() => setShowReplyForm(false)}
                    placeholder="Write a reply..."
                  />
                </div>
              )}

              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2 space-y-2">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      userVote={userVote}
                      onVote={onVote}
                      onReply={onReply}
                      onPinToggle={onPinToggle}
                      postAuthorId={postAuthorId}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {isCollapsed && (
            <div className="text-xs text-gray-600 font-mono">
              [{comment.replies?.length || 0} replies collapsed]
            </div>
          )}
        </div>
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        contentType="comment"
        contentId={comment.id}
        reportedUserId={comment.author_id}
      />
    </div>
  );
});
