import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type BookmarkButtonProps = {
  postId: string;
  variant?: 'default' | 'compact';
  showLabel?: boolean;
};

export function BookmarkButton({ postId, variant = 'default', showLabel = false }: BookmarkButtonProps) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkBookmarkStatus();
    }
  }, [user, postId]);

  const checkBookmarkStatus = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    if (!error && data) {
      setIsBookmarked(true);
    } else {
      setIsBookmarked(false);
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) return;

    setLoading(true);

    try {
      if (isBookmarked) {
        // Remove bookmark
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        setIsBookmarked(false);
      } else {
        // Add bookmark
        await supabase.from('bookmarks').insert({
          user_id: user.id,
          post_id: postId,
        });
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (variant === 'compact') {
    return (
      <button
        onClick={handleToggleBookmark}
        disabled={loading}
        className="p-1.5 rounded hover:bg-gray-800 transition-colors group disabled:opacity-50"
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this post'}
      >
        {isBookmarked ? (
          <BookmarkCheck size={16} className="text-terminal-purple" />
        ) : (
          <Bookmark size={16} className="text-gray-500 group-hover:text-gray-300" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleBookmark}
      disabled={loading}
      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all disabled:opacity-50 ${
        isBookmarked
          ? 'border-terminal-purple bg-terminal-purple/20 text-terminal-purple'
          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
      }`}
    >
      {isBookmarked ? (
        <BookmarkCheck size={14} />
      ) : (
        <Bookmark size={14} />
      )}
      {showLabel && <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>}
    </button>
  );
}
