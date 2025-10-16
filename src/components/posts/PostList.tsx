import { useState, useEffect, useCallback } from 'react';
import { supabase, Post } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PostCard } from './PostCard';
import { Loader2, ChevronDown } from 'lucide-react';

type PostListProps = {
  postType: 'news' | 'blog';
  onPostClick: (post: Post) => void;
};

type SortOption = 'hot' | 'new' | 'top';

// Pagination configuration
const POSTS_PER_PAGE = 50;

export function PostList({ postType, onPostClick }: PostListProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('hot');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Calculate range for pagination
      const from = pageNum * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // Build optimized query with explicit fields
      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          subtitle,
          content,
          author_id,
          post_type,
          category,
          image_url,
          vote_count,
          comment_count,
          is_published,
          is_draft,
          featured,
          created_at,
          updated_at,
          published_at,
          reading_time_minutes,
          seo_title,
          seo_description,
          canonical_url,
          profiles:author_id (
            id,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('post_type', postType)
        .eq('is_published', true)
        .eq('is_draft', false);

      // Apply sorting
      if (sortBy === 'hot') {
        query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'new') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'top') {
        query = query.order('vote_count', { ascending: false });
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      // Transform profiles from array to single object (Supabase returns as array)
      const postsData: Post[] = (data || []).map((item) => ({
        ...(item as unknown as Post),
        profiles: Array.isArray((item as { profiles?: unknown }).profiles)
          ? (item as { profiles: unknown[] }).profiles[0]
          : (item as { profiles?: unknown }).profiles,
      })) as Post[];

      // Check if we have more pages
      setHasMore(postsData.length === POSTS_PER_PAGE);

      // Load user votes for the new posts (only if user is authenticated)
      if (user && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('post_id, vote_type')
          .eq('user_id', user.id)
          .in('post_id', postIds)
          .not('post_id', 'is', null);

        if (!votesError && votesData) {
          const votesMap: Record<string, 1 | -1> = {};
          votesData.forEach((vote) => {
            if (vote.post_id) {
              votesMap[vote.post_id] = vote.vote_type;
            }
          });
          setUserVotes(prev => append ? { ...prev, ...votesMap } : votesMap);
        }
      }

      // Update posts (append or replace)
      if (append) {
        setPosts(prev => [...prev, ...postsData]);
      } else {
        setPosts(postsData);
      }

    } catch (error) {
      console.error('Error loading posts:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [postType, sortBy, user]);

  // Reset to page 0 when sort or type changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadPosts(0, false);
  }, [postType, sortBy, loadPosts]);

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

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
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
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userVote={userVotes[post.id] || null}
                onVote={handleVote}
                onClick={() => onPostClick(post)}
              />
            ))}

            {hasMore && (
              <div className="flex justify-center py-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={20} />
                      <span>Load More Posts</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">You've reached the end!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
