import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Bookmark, BookmarkCheck, BookmarkX, FolderPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';
import { AddToReadingListModal } from '../components/reading-lists/AddToReadingListModal';

export function BookmarksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingListModalOpen, setReadingListModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          post_id,
          posts (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const posts = data
        ?.map((bookmark: any) => bookmark.posts)
        .filter((post): post is Post => post !== null) || [];

      setBookmarkedPosts(posts);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  const handleRemoveBookmark = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      setBookmarkedPosts(bookmarkedPosts.filter((post) => post.id !== postId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const handleAddToReadingList = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPostId(postId);
    setReadingListModalOpen(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <Bookmark size={48} className="text-gray-600 mx-auto" />
          <p className="text-gray-400">Please sign in to view your bookmarks</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> bookmarks
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          {bookmarkedPosts.length} saved {bookmarkedPosts.length === 1 ? 'post' : 'posts'}
        </p>
      </div>

      {bookmarkedPosts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Bookmark size={48} className="text-gray-600 mx-auto" />
            <p className="text-gray-400">No bookmarks yet</p>
            <p className="text-sm text-gray-500">
              Bookmark posts to read them later
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarkedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => handlePostClick(post)}
              className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-terminal-green cursor-pointer transition-all duration-220 shadow-lg hover:shadow-glow-purple"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <BookmarkCheck size={18} className="text-terminal-purple flex-shrink-0" />
                    <h2 className="text-xl font-bold text-gray-100 font-mono">{post.title}</h2>
                  </div>
                  <p className="text-gray-400 line-clamp-2 font-mono text-sm mb-4">{post.content}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 font-mono">
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{post.vote_count} votes</span>
                    {post.category && (
                      <>
                        <span>•</span>
                        <span className="text-terminal-purple">{post.category}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleAddToReadingList(post.id, e)}
                    className="p-2 rounded hover:bg-gray-800 text-gray-500 hover:text-terminal-blue transition-colors"
                    title="Add to reading list"
                  >
                    <FolderPlus size={18} />
                  </button>
                  <button
                    onClick={(e) => handleRemoveBookmark(post.id, e)}
                    className="p-2 rounded hover:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors"
                    title="Remove bookmark"
                  >
                    <BookmarkX size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPostId && (
        <AddToReadingListModal
          isOpen={readingListModalOpen}
          onClose={() => {
            setReadingListModalOpen(false);
            setSelectedPostId(null);
          }}
          postId={selectedPostId}
        />
      )}
    </div>
  );
}
