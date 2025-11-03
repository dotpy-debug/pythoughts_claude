import { useState, useEffect, useCallback } from 'react';
import { supabase, Post } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PostCard } from './PostCard';
import { TrendingUp, Clock, BarChart } from 'lucide-react';
import { InfiniteScroll } from '../performance/InfiniteScroll';
import { PostCardSkeleton } from '../performance/SkeletonLoaders';

type PostListProperties = {
  postType: 'news' | 'blog';
  onPostClick: (post: Post) => void;
  authorId?: string; // Optional filter by author
};

type SortOption = 'hot' | 'new' | 'top';

// Pagination configuration
const POSTS_PER_PAGE = 50;

export function PostList({ postType, onPostClick, authorId }: PostListProperties) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('hot');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPosts = useCallback(async (pageNumber: number = 0, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Calculate range for pagination
      const from = pageNumber * POSTS_PER_PAGE;
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

      // Filter by author if provided
      if (authorId) {
        query = query.eq('author_id', authorId);
      }

      // Apply sorting
      switch (sortBy) {
      case 'hot': {
        query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false });
      
      break;
      }
      case 'new': {
        query = query.order('created_at', { ascending: false });
      
      break;
      }
      case 'top': {
        query = query.order('vote_count', { ascending: false });
      
      break;
      }
      // No default
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
          for (const vote of votesData) {
            if (vote.post_id) {
              votesMap[vote.post_id] = vote.vote_type;
            }
          }
          setUserVotes(previous => append ? { ...previous, ...votesMap } : votesMap);
        }
      }

      // Update posts (append or replace)
      if (append) {
        setPosts(previous => [...previous, ...postsData]);
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
  }, [postType, sortBy, user, authorId]);

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

        setPosts((previousPosts) =>
          previousPosts.map((post) =>
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

        setPosts((previousPosts) =>
          previousPosts.map((post) =>
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

        setPosts((previousPosts) =>
          previousPosts.map((post) =>
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
      <div className="space-y-4">
        {Array.from({length: 3}).map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-xs text-gray-500 font-mono mr-2">$ sort:</span>
        <button
          onClick={() => setSortBy('hot')}
          className={`px-4 py-2 rounded font-mono text-sm transition-all border flex items-center space-x-2 ${
            sortBy === 'hot'
              ? 'bg-terminal-green/20 text-terminal-green border-terminal-green'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
          }`}
        >
          <TrendingUp size={14} />
          <span>Hot</span>
        </button>
        <button
          onClick={() => setSortBy('new')}
          className={`px-4 py-2 rounded font-mono text-sm transition-all border flex items-center space-x-2 ${
            sortBy === 'new'
              ? 'bg-terminal-green/20 text-terminal-green border-terminal-green'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
          }`}
        >
          <Clock size={14} />
          <span>New</span>
        </button>
        <button
          onClick={() => setSortBy('top')}
          className={`px-4 py-2 rounded font-mono text-sm transition-all border flex items-center space-x-2 ${
            sortBy === 'top'
              ? 'bg-terminal-green/20 text-terminal-green border-terminal-green'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
          }`}
        >
          <BarChart size={14} />
          <span>Top</span>
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-700 rounded-lg">
          <p className="text-gray-500 font-mono">No posts yet. Be the first to create one!</p>
        </div>
      ) : (
        <InfiniteScroll
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loadingMore}
        >
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userVote={userVotes[post.id] || null}
                onVote={handleVote}
                onClick={() => onPostClick(post)}
              />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
}
