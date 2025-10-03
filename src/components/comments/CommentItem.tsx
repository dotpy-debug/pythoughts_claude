import { useState } from 'react';
import { ArrowUp, ArrowDown, MessageCircle, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Comment } from '../../lib/supabase';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { CommentForm } from './CommentForm';
import { sanitizeURL } from '../../utils/security';

type CommentItemProps = {
  comment: Comment;
  userVote?: 1 | -1 | null;
  onVote: (commentId: string, voteType: 1 | -1) => void;
  onReply: (parentId: string, content: string) => Promise<void>;
  depth: number;
};

export function CommentItem({ comment, userVote, onVote, onReply, depth }: CommentItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleVote = (voteType: 1 | -1) => {
    onVote(comment.id, voteType);
  };

  const handleReply = async (content: string) => {
    await onReply(comment.id, content);
    setShowReplyForm(false);
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
            <span className="text-xs text-gray-600 font-mono">
              {formatDistanceToNow(comment.created_at)}
            </span>
          </div>

          {!isCollapsed && (
            <>
              <p className="text-gray-300 text-sm mb-2 font-mono">{comment.content}</p>

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
                    userVote === 1 ? 'text-terminal-green' : userVote === -1 ? 'text-terminal-pink' : 'text-gray-500'
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
    </div>
  );
}
