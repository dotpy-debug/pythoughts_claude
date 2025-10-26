import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';
import { PostCard } from '../components/posts/PostCard';
import { ShadcnButton } from '../components/ui/ShadcnButton';

type ActivityFilter = 'all' | 'news' | 'blog';
type ActivitySort = 'recent' | 'popular';

const POSTS_PER_PAGE = 20;

export function ActivityFeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [sortBy, setSortBy] = useState<ActivitySort>('recent');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [followingCount, setFollowingCount] = useState(0);

  const loadActivityFeed = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) return;

    try {
      setLoading(true);

      // First, get list of users the current user follows
      const { data: followingData, error: followingError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followingError) throw followingError;

      if (!followingData || followingData.length === 0) {
        setPosts([]);
        setHasMore(false);
        setFollowingCount(0);
        setLoading(false);
        return;
      }

      setFollowingCount(followingData.length);
      const followingIds = followingData.map(f => f.following_id);

      // Build query to get posts from followed users
      const from = pageNum * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

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
        .in('author_id', followingIds)
        .eq('is_published', true)
        .eq('is_draft', false);

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('post_type', filter);
      }

      // Apply sorting
      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'popular') {
        query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false });
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      // Transform profiles from array to single object
      const postsData: Post[] = (data || []).map((item) => ({
        ...(item as unknown as Post),
        profiles: Array.isArray((item as { profiles?: unknown }).profiles)
          ? (item as { profiles: unknown[] }).profiles[0]
          : (item as { profiles?: unknown }).profiles,
      })) as Post[];

      setHasMore(postsData.length === POSTS_PER_PAGE);

      // Load user votes
      if (postsData.length > 0) {
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

      // Update posts
      if (append) {
        setPosts(prev => [...prev, ...postsData]);
      } else {
        setPosts(postsData);
      }

    } catch (error) {
      console.error('Error loading activity feed:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [user, filter, sortBy]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadActivityFeed(0, false);
  }, [filter, sortBy, loadActivityFeed]);

  const handleVote = async (postId: string, voteType: 1 | -1) => {
    if (!user) return;

    try {
      const existingVote = userVotes[postId];

      if (existingVote === voteType) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        const newVotes = { ...userVotes };
        delete newVotes[postId];
        setUserVotes(newVotes);

        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? { ...post, vote_count: post.vote_count - voteType }
              : post
          )
        );
      } else if (existingVote) {
        // Change vote
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('user_id', user.id)
          .eq('post_id', postId);

        setUserVotes({ ...userVotes, [postId]: voteType });

        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? { ...post, vote_count: post.vote_count - existingVote + voteType }
              : post
          )
        );
      } else {
        // New vote
        await supabase.from('votes').insert({
          user_id: user.id,
          post_id: postId,
          vote_type: voteType,
        });

        setUserVotes({ ...userVotes, [postId]: voteType });

        setPosts(prevPosts =>
          prevPosts.map(post =>
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

  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadActivityFeed(nextPage, true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <Users size={48} className="text-gray-600 mx-auto" />
          <p className="text-gray-400">Please sign in to view your activity feed</p>
        </div>
      </div>
    );
  }

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> activity feed
          </h1>
          <p className="text-gray-400 font-mono text-sm mt-2">
            Posts from {followingCount} {followingCount === 1 ? 'user' : 'users'} you follow
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-terminal-green" />
          <span className="text-gray-400 font-mono text-sm">Filter:</span>
          <ShadcnButton
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </ShadcnButton>
          <ShadcnButton
            variant={filter === 'news' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('news')}
          >
            News
          </ShadcnButton>
          <ShadcnButton
            variant={filter === 'blog' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('blog')}
          >
            Blogs
          </ShadcnButton>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400 font-mono text-sm">Sort:</span>
          <ShadcnButton
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('recent')}
          >
            Recent
          </ShadcnButton>
          <ShadcnButton
            variant={sortBy === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('popular')}
          >
            Popular
          </ShadcnButton>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Users size={48} className="text-gray-600 mx-auto" />
            <p className="text-gray-400">No posts from users you follow yet</p>
            <ShadcnButton
              variant="outline"
              onClick={() => navigate('/explore')}
            >
              Explore Users
            </ShadcnButton>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userVote={userVotes[post.id] || null}
                onVote={handleVote}
                onClick={() => handlePostClick(post)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center py-8">
              <ShadcnButton
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </ShadcnButton>
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
  );
}
