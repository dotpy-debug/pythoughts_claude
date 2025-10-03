import { useState, useEffect, useCallback } from 'react';
import { supabase, Post, Vote } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PostCard } from './PostCard';
import { Loader2 } from 'lucide-react';

type PostListProps = {
  postType: 'news' | 'blog';
  onPostClick: (post: Post) => void;
};

type SortOption = 'hot' | 'new' | 'top';

export function PostList({ postType, onPostClick }: PostListProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('hot');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('post_type', postType)
        .eq('is_published', true);

      if (sortBy === 'hot') {
        query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'new') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'top') {
        query = query.order('vote_count', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [postType, sortBy]);

  const loadUserVotes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('post_id, vote_type')
        .eq('user_id', user.id)
        .not('post_id', 'is', null);

      if (error) throw error;

      const votesMap: Record<string, 1 | -1> = {};
      data?.forEach((vote: Pick<Vote, 'post_id' | 'vote_type'>) => {
        if (vote.post_id) {
          votesMap[vote.post_id] = vote.vote_type;
        }
      });
      setUserVotes(votesMap);
    } catch (error) {
      console.error('Error loading user votes:', error);
    }
  }, [user]);

  useEffect(() => {
    loadPosts();
    if (user) {
      loadUserVotes();
    }
  }, [postType, sortBy, user, loadPosts, loadUserVotes]);

  const handleVote = async (postId: string, voteType: 1 | -1) => {
    if (!user) return;

    try {
      const existingVote = userVotes[postId];

      if (existingVote === voteType) {
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        const newVotes = { ...userVotes };
        delete newVotes[postId];
        setUserVotes(newVotes);

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, vote_count: post.vote_count - voteType }
              : post
          )
        );
      } else if (existingVote) {
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('user_id', user.id)
          .eq('post_id', postId);

        setUserVotes({ ...userVotes, [postId]: voteType });

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, vote_count: post.vote_count - existingVote + voteType }
              : post
          )
        );
      } else {
        await supabase.from('votes').insert({
          user_id: user.id,
          post_id: postId,
          vote_type: voteType,
        });

        setUserVotes({ ...userVotes, [postId]: voteType });

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, vote_count: post.vote_count + voteType }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <button
          onClick={() => setSortBy('hot')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'hot'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Hot
        </button>
        <button
          onClick={() => setSortBy('new')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'new'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          New
        </button>
        <button
          onClick={() => setSortBy('top')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'top'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Top
        </button>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts yet. Be the first to create one!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userVote={userVotes[post.id] || null}
              onVote={handleVote}
              onClick={() => onPostClick(post)}
            />
          ))
        )}
      </div>
    </div>
  );
}
