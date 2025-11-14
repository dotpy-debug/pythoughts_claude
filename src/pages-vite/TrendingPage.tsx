import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp, Flame, Clock } from 'lucide-react';
import { supabase, Post } from '../lib/supabase';
import { PostCard } from '../components/posts/PostCard';
import { useAuth } from '../contexts/AuthContext';

type TimeRange = '24h' | '7d' | '30d' | 'all';

type TrendingPost = Post & {
  trending_score: number;
  view_count: number;
};

const POSTS_PER_PAGE = 20;

export function TrendingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const calculateTrendingScore = (
    voteCount: number,
    commentCount: number,
    viewCount: number,
    createdAt: string
  ): number => {
    // Reddit-style "hot" algorithm
    // Score based on votes, comments, views, and recency

    const now = Date.now();
    const postTime = new Date(createdAt).getTime();
    const ageInHours = (now - postTime) / (1000 * 60 * 60);

    // Weight different metrics
    const voteScore = voteCount * 2; // Votes are worth 2 points each
    const commentScore = commentCount * 1.5; // Comments worth 1.5 points
    const viewScore = viewCount * 0.1; // Views worth 0.1 points

    const totalEngagement = voteScore + commentScore + viewScore;

    // Apply time decay (posts lose 50% of score every 24 hours)
    const timeDecay = Math.pow(0.5, ageInHours / 24);

    return totalEngagement * timeDecay;
  };

  const loadTrendingPosts = useCallback(async (pageNumber: number = 0, append: boolean = false) => {
    try {
      setLoading(!append);

      // Calculate date range
      const dateFilter = new Date();
      switch (timeRange) {
      case '24h': {
        dateFilter.setHours(dateFilter.getHours() - 24);
      
      break;
      }
      case '7d': {
        dateFilter.setDate(dateFilter.getDate() - 7);
      
      break;
      }
      case '30d': {
        dateFilter.setDate(dateFilter.getDate() - 30);
      
      break;
      }
      // No default
      }

      const from = pageNumber * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // Get posts with engagement metrics
      let postsQuery = supabase
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
        .eq('is_published', true)
        .eq('is_draft', false);

      if (timeRange !== 'all') {
        postsQuery = postsQuery.gte('created_at', dateFilter.toISOString());
      }

      const { data, error } = await postsQuery;
      if (error) throw error;

      // Transform profiles from array to single object
      const postsData: Post[] = (data || []).map((item) => ({
        ...(item as unknown as Post),
        profiles: Array.isArray((item as { profiles?: unknown }).profiles)
          ? (item as { profiles: unknown[] }).profiles[0]
          : (item as { profiles?: unknown }).profiles,
      })) as Post[];

      // Get view counts for posts
      const postIds = postsData.map(p => p.id);
      const viewCounts: Record<string, number> = {};

      if (postIds.length > 0) {
        const { data: viewsData } = await supabase
          .from('post_views')
          .select('post_id')
          .in('post_id', postIds);

        if (viewsData) {
          for (const view of viewsData) {
            viewCounts[view.post_id] = (viewCounts[view.post_id] || 0) + 1;
          }
        }
      }

      // Calculate trending scores
      const trendingPosts: TrendingPost[] = postsData.map(post => ({
        ...post,
        view_count: viewCounts[post.id] || 0,
        trending_score: calculateTrendingScore(
          post.vote_count || 0,
          post.comment_count || 0,
          viewCounts[post.id] || 0,
          post.created_at
        ),
      }));

      // Sort by trending score
      trendingPosts.sort((a, b) => b.trending_score - a.trending_score);

      // Apply pagination
      const paginatedPosts = trendingPosts.slice(from, to + 1);
      setHasMore(paginatedPosts.length === POSTS_PER_PAGE);

      // Load user votes
      if (user && paginatedPosts.length > 0) {
        const paginatedPostIds = paginatedPosts.map(p => p.id);
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('post_id, vote_type')
          .eq('user_id', user.id)
          .in('post_id', paginatedPostIds)
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

      // Update posts
      if (append) {
        setPosts(previous => [...previous, ...paginatedPosts]);
      } else {
        setPosts(paginatedPosts);
      }
    } catch (error) {
      console.error('Error loading trending posts:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [timeRange, user]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadTrendingPosts(0, false);
  }, [timeRange, loadTrendingPosts]);

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

        setPosts(previousPosts =>
          previousPosts.map(post =>
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

        setPosts(previousPosts =>
          previousPosts.map(post =>
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

        setPosts(previousPosts =>
          previousPosts.map(post =>
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
    loadTrendingPosts(nextPage, true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Flame className="text-orange-500" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-100 font-mono">
              <span className="text-terminal-green">$</span> trending
            </h1>
            <p className="text-gray-400 font-mono text-sm mt-1">
              Hottest posts based on engagement and recency
            </p>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 font-mono text-sm focus:outline-none focus:border-terminal-green"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Posts */}
      {loading && posts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-terminal-green" size={48} />
        </div>
      ) : (posts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <TrendingUp size={48} className="text-gray-600 mx-auto" />
            <p className="text-gray-400">No trending posts yet</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post, index) => (
              <div key={post.id} className="relative">
                {/* Trending Rank Badge */}
                <div className="absolute -left-12 top-8 flex items-center justify-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500' :
                    index === 1 ? 'bg-gray-400/20 text-gray-400 border-2 border-gray-400' :
                    index === 2 ? 'bg-orange-700/20 text-orange-700 border-2 border-orange-700' :
                    'bg-gray-800 text-gray-500 border border-gray-700'
                  }`}>
                    #{index + 1}
                  </div>
                </div>
                <PostCard
                  post={post}
                  userVote={userVotes[post.id] || null}
                  onVote={handleVote}
                  onClick={() => handlePostClick(post)}
                />
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center py-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-terminal-green text-gray-900 rounded-lg font-medium font-mono hover:bg-terminal-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp size={20} />
                    <span>Load More</span>
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 font-mono">You've reached the end!</p>
            </div>
          )}
        </>
      ))}
    </div>
  );
}
