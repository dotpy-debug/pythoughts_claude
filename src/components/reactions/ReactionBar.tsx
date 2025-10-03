import { useState, useEffect, useCallback } from 'react';
import { supabase, Reaction } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { EmojiReactionPicker } from './EmojiReactionPicker';

type ReactionBarProps = {
  postId?: string;
  commentId?: string;
};

const emojiMap: Record<string, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
  heart: '💖',
  fire: '🔥',
  clap: '👏',
  thinking: '🤔',
  celebrate: '🎉',
  rocket: '🚀',
};

export function ReactionBar({ postId, commentId }: ReactionBarProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const loadReactions = useCallback(async () => {
    try {
      let query = supabase.from('reactions').select('*, profiles(*)');

      if (postId) {
        query = query.eq('post_id', postId);
      } else if (commentId) {
        query = query.eq('comment_id', commentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReactions(data || []);
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  }, [postId, commentId]);

  const subscribeToReactions = useCallback(() => {
    const table = 'reactions';
    const filter = postId
      ? `post_id=eq.${postId}`
      : commentId
      ? `comment_id=eq.${commentId}`
      : '';

    const channel = supabase
      .channel(`reactions:${postId || commentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        () => {
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, commentId, loadReactions]);

  useEffect(() => {
    loadReactions();
    const unsubscribe = subscribeToReactions();
    return unsubscribe;
  }, [loadReactions, subscribeToReactions]);

  const handleReact = async (type: Reaction['reaction_type']) => {
    if (!user) return;

    try {
      const existingReaction = reactions.find(
        (r) => r.user_id === user.id && r.reaction_type === type
      );

      if (existingReaction) {
        await supabase.from('reactions').delete().eq('id', existingReaction.id);
      } else {
        const userReaction = reactions.find((r) => r.user_id === user.id);
        if (userReaction) {
          await supabase
            .from('reactions')
            .update({ reaction_type: type })
            .eq('id', userReaction.id);
        } else {
          await supabase.from('reactions').insert({
            user_id: user.id,
            post_id: postId || null,
            comment_id: commentId || null,
            reaction_type: type,
          });
        }
      }

      await loadReactions();
    } catch (error) {
      console.error('Error reacting:', error);
    }
  };

  const reactionCounts: Record<string, number> = {};
  reactions.forEach((reaction) => {
    reactionCounts[reaction.reaction_type] = (reactionCounts[reaction.reaction_type] || 0) + 1;
  });

  const userReactions = user ? reactions.filter((r) => r.user_id === user.id).map((r) => r.reaction_type) : [];

  const topReactions = Object.entries(reactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex items-center space-x-2">
      <EmojiReactionPicker
        onReact={handleReact}
        userReactions={userReactions}
        reactions={reactionCounts}
      />

      {topReactions.length > 0 && (
        <div className="flex items-center space-x-1">
          {topReactions.map(([type, count]) => (
            <div
              key={type}
              className="flex items-center space-x-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs"
            >
              <span>{emojiMap[type]}</span>
              <span className="text-gray-400 font-mono">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
