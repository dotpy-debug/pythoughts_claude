import { useState, useEffect, useCallback } from 'react';
import { supabase, ReadingList } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Bookmark as BookmarkIcon, BookmarkCheck } from 'lucide-react';

type BookmarkButtonProps = {
  postId: string;
  variant?: 'icon' | 'button';
};

export function BookmarkButton({ postId, variant = 'icon' }: BookmarkButtonProps) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(false);

  const checkBookmark = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      setIsBookmarked(!!data);
    } catch (error) {
      console.error('Error checking bookmark:', error);
    }
  }, [user, postId]);

  const loadReadingLists = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reading_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReadingLists(data || []);
    } catch (error) {
      console.error('Error loading reading lists:', error);
    }
  }, [user]);

  useEffect(() => {
    checkBookmark();
  }, [checkBookmark]);

  const handleBookmark = async (readingListId?: string) => {
    if (!user) return;

    setLoading(true);
    try {
      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        setIsBookmarked(false);
      } else {
        await supabase.from('bookmarks').insert({
          user_id: user.id,
          post_id: postId,
          reading_list_id: readingListId || null,
          notes: '',
        });
        setIsBookmarked(true);
      }
      setShowListSelector(false);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (!user) return;

    if (isBookmarked) {
      handleBookmark();
    } else {
      await loadReadingLists();
      if (readingLists.length > 0) {
        setShowListSelector(true);
      } else {
        handleBookmark();
      }
    }
  };

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={!user || loading}
          className={`p-2 rounded-lg transition-colors ${
            isBookmarked
              ? 'text-terminal-blue bg-terminal-blue/20'
              : 'text-gray-400 hover:text-terminal-blue hover:bg-gray-800'
          } ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark this post'}
        >
          {isBookmarked ? (
            <BookmarkCheck size={20} className="fill-current" />
          ) : (
            <BookmarkIcon size={20} />
          )}
        </button>

        {showListSelector && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <p className="text-sm font-semibold text-gray-100 font-mono">
                Save to reading list
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <button
                onClick={() => handleBookmark()}
                className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors text-gray-300 text-sm font-mono"
              >
                No list (default)
              </button>
              {readingLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleBookmark(list.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                >
                  <div className="text-sm font-medium text-gray-100 font-mono">
                    {list.name}
                  </div>
                  {list.description && (
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {list.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-700">
              <button
                onClick={() => setShowListSelector(false)}
                className="w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showListSelector && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowListSelector(false)}
          />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!user || loading}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-mono transition-colors ${
        isBookmarked
          ? 'bg-terminal-blue/20 text-terminal-blue border border-terminal-blue'
          : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-terminal-blue hover:text-terminal-blue'
      } ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {isBookmarked ? (
        <>
          <BookmarkCheck size={18} className="fill-current" />
          <span>Bookmarked</span>
        </>
      ) : (
        <>
          <BookmarkIcon size={18} />
          <span>Bookmark</span>
        </>
      )}
    </button>
  );
}