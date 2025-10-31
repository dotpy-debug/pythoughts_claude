/**
 * Comment Reactions Component
 *
 * Emoji-style reactions for comments (similar to GitHub/Slack)
 * Features:
 * - Multiple reaction types
 * - Toggle reactions on/off
 * - Reaction counts
 * - Reaction picker dropdown
 * - Terminal-themed styling
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Available reaction types
 */
export const REACTION_TYPES = {
  thumbs_up: { emoji: '👍', label: 'Thumbs up' },
  heart: { emoji: '❤️', label: 'Heart' },
  laugh: { emoji: '😂', label: 'Laugh' },
  celebrate: { emoji: '🎉', label: 'Celebrate' },
  thinking: { emoji: '🤔', label: 'Thinking' },
  thumbs_down: { emoji: '👎', label: 'Thumbs down' },
} as const;

export type ReactionType = keyof typeof REACTION_TYPES;

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface CommentReactionsProps {
  commentId: string;
  reactionCounts?: Record<string, number>;
  className?: string;
}

/**
 * CommentReactions Component
 *
 * @example
 * ```tsx
 * <CommentReactions
 *   commentId="123"
 *   reactionCounts={{ thumbs_up: 5, heart: 2 }}
 * />
 * ```
 */
export function CommentReactions({
  commentId,
  reactionCounts = {},
  className,
}: CommentReactionsProps) {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [userReactions, setUserReactions] = useState<Set<ReactionType>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);

  const loadUserReactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('comment_reactions')
        .select('reaction_type')
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      const reactions = new Set<ReactionType>(
        (data || []).map((r) => r.reaction_type as ReactionType)
      );
      setUserReactions(reactions);
    } catch (error) {
      console.error('Error loading user reactions:', error);
    }
  }, [user, commentId]);

  // Load user's reactions for this comment
  useEffect(() => {
    if (!user) return;
    loadUserReactions();
  }, [user, commentId, loadUserReactions]);

  const toggleReaction = async (reactionType: ReactionType) => {
    if (!user) {
      alert('Please sign in to react to comments');
      return;
    }

    setLoading(true);

    try {
      const hasReaction = userReactions.has(reactionType);

      if (hasReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('reaction_type', reactionType);

        if (error) throw error;

        setUserReactions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(reactionType);
          return newSet;
        });
      } else {
        // Add reaction
        const { error } = await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType,
          });

        if (error) throw error;

        setUserReactions((prev) => new Set([...prev, reactionType]));
      }

      setShowPicker(false);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get reactions to display (only those with counts > 0)
  const activeReactions = Object.entries(REACTION_TYPES)
    .filter(([type]) => reactionCounts[type] > 0)
    .map(([type, config]) => ({
      type: type as ReactionType,
      ...config,
      count: reactionCounts[type],
      userReacted: userReactions.has(type as ReactionType),
    }));

  return (
    <div className={cn('relative flex items-center gap-1 flex-wrap', className)}>
      {/* Active Reactions */}
      {activeReactions.map((reaction) => (
        <button
          key={reaction.type}
          onClick={() => toggleReaction(reaction.type)}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg',
            'text-sm font-mono transition-all duration-200',
            'border disabled:opacity-50 disabled:cursor-not-allowed',
            reaction.userReacted
              ? 'bg-terminal-green/20 border-terminal-green text-terminal-green font-bold'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
          )}
          title={`${reaction.label}${reaction.userReacted ? ' (you reacted)' : ''}`}
        >
          <span className="text-base leading-none">{reaction.emoji}</span>
          <span className="text-xs">{reaction.count}</span>
          {reaction.userReacted && (
            <Check size={12} className="text-terminal-green" />
          )}
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={loading || !user}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-lg',
            'text-sm font-mono transition-all duration-200',
            'bg-gray-800 border border-gray-700',
            'hover:border-terminal-green hover:text-terminal-green',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title={user ? 'Add reaction' : 'Sign in to react'}
        >
          <Plus size={14} />
          <span className="text-xs">React</span>
        </button>

        {/* Reaction Picker */}
        {showPicker && user && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />

            {/* Picker Dropdown */}
            <div className="absolute bottom-full left-0 mb-2 z-50 bg-gray-900 border-2 border-terminal-green rounded-lg shadow-2xl p-2">
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(REACTION_TYPES).map(([type, config]) => {
                  const hasReaction = userReactions.has(type as ReactionType);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleReaction(type as ReactionType)}
                      disabled={loading}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-lg',
                        'transition-all duration-200',
                        'border disabled:opacity-50',
                        hasReaction
                          ? 'bg-terminal-green/20 border-terminal-green'
                          : 'bg-gray-800 border-gray-700 hover:border-terminal-green hover:bg-gray-700'
                      )}
                      title={config.label}
                    >
                      <span className="text-2xl mb-1">{config.emoji}</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {config.label.split(' ')[0]}
                      </span>
                      {hasReaction && (
                        <Check
                          size={12}
                          className="text-terminal-green mt-1"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CommentReactions;
