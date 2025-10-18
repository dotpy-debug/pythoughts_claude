import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';

export function BookmarksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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
              className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-terminal-green cursor-pointer transition-all duration-220"
            >
              <h2 className="text-xl font-bold text-gray-100 mb-2">{post.title}</h2>
              <p className="text-gray-400 line-clamp-2">{post.content}</p>
              <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>{post.vote_count} votes</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
