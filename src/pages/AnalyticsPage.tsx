import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp, Eye, Heart, MessageCircle, Users, FileText, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';
import { ShadcnCard, ShadcnCardContent } from '../components/ui/ShadcnCard';
import { formatDistanceToNow } from '../utils/dateUtils';

type AnalyticsData = {
  totalPosts: number;
  totalViews: number;
  totalVotes: number;
  totalComments: number;
  totalFollowers: number;
  topPosts: Post[];
  recentActivity: ActivityItem[];
};

type ActivityItem = {
  id: string;
  type: 'post' | 'comment' | 'vote' | 'follow';
  description: string;
  created_at: string;
};

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalPosts: 0,
    totalViews: 0,
    totalVotes: 0,
    totalComments: 0,
    totalFollowers: 0,
    topPosts: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Calculate date range
      let dateFilter = new Date();
      if (timeRange === '7d') {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (timeRange === '30d') {
        dateFilter.setDate(dateFilter.getDate() - 30);
      } else if (timeRange === '90d') {
        dateFilter.setDate(dateFilter.getDate() - 90);
      }

      // Get user's posts with stats
      let postsQuery = supabase
        .from('posts')
        .select('*')
        .eq('author_id', user.id)
        .eq('is_published', true);

      if (timeRange !== 'all') {
        postsQuery = postsQuery.gte('created_at', dateFilter.toISOString());
      }

      const { data: posts, error: postsError } = await postsQuery;
      if (postsError) throw postsError;

      const postIds = posts?.map(p => p.id) || [];

      // Get total views (if view tracking exists)
      let totalViews = 0;
      if (postIds.length > 0) {
        const { data: viewsData, error: viewsError } = await supabase
          .from('post_views')
          .select('id')
          .in('post_id', postIds);

        if (!viewsError && viewsData) {
          totalViews = viewsData.length;
        }
      }

      // Get total votes
      const totalVotes = posts?.reduce((sum, post) => sum + (post.vote_count || 0), 0) || 0;

      // Get total comments
      const totalComments = posts?.reduce((sum, post) => sum + (post.comment_count || 0), 0) || 0;

      // Get follower count
      const { data: followersData, error: followersError } = await supabase
        .from('user_follows')
        .select('id')
        .eq('following_id', user.id);

      if (followersError) throw followersError;

      // Get top performing posts (by vote_count)
      const topPosts = [...(posts || [])]
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
        .slice(0, 5);

      // Get recent activity (posts created)
      const recentActivity: ActivityItem[] = (posts || [])
        .slice(0, 10)
        .map(post => ({
          id: post.id,
          type: 'post' as const,
          description: `Published: ${post.title}`,
          created_at: post.created_at,
        }));

      setAnalytics({
        totalPosts: posts?.length || 0,
        totalViews,
        totalVotes,
        totalComments,
        totalFollowers: followersData?.length || 0,
        topPosts,
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Please sign in to view analytics</p>
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> analytics
          </h1>
          <p className="text-gray-400 font-mono text-sm mt-2">
            Track your content performance and engagement
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 font-mono text-sm">Period:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 font-mono text-sm focus:outline-none focus:border-terminal-green"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Posts */}
        <ShadcnCard className="bg-gray-900 border-gray-700 hover:border-terminal-green transition-colors">
          <ShadcnCardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="text-terminal-green" size={24} />
              <span className="text-xs font-mono text-gray-500">POSTS</span>
            </div>
            <p className="text-3xl font-bold text-gray-100 font-mono">{analytics.totalPosts}</p>
            <p className="text-sm text-gray-400 font-mono mt-1">Total published</p>
          </ShadcnCardContent>
        </ShadcnCard>

        {/* Total Views */}
        <ShadcnCard className="bg-gray-900 border-gray-700 hover:border-terminal-blue transition-colors">
          <ShadcnCardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="text-terminal-blue" size={24} />
              <span className="text-xs font-mono text-gray-500">VIEWS</span>
            </div>
            <p className="text-3xl font-bold text-gray-100 font-mono">{analytics.totalViews}</p>
            <p className="text-sm text-gray-400 font-mono mt-1">Total views</p>
          </ShadcnCardContent>
        </ShadcnCard>

        {/* Total Votes */}
        <ShadcnCard className="bg-gray-900 border-gray-700 hover:border-terminal-purple transition-colors">
          <ShadcnCardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Heart className="text-terminal-purple" size={24} />
              <span className="text-xs font-mono text-gray-500">VOTES</span>
            </div>
            <p className="text-3xl font-bold text-gray-100 font-mono">{analytics.totalVotes}</p>
            <p className="text-sm text-gray-400 font-mono mt-1">Net votes</p>
          </ShadcnCardContent>
        </ShadcnCard>

        {/* Total Followers */}
        <ShadcnCard className="bg-gray-900 border-gray-700 hover:border-terminal-pink transition-colors">
          <ShadcnCardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-terminal-pink" size={24} />
              <span className="text-xs font-mono text-gray-500">FOLLOWERS</span>
            </div>
            <p className="text-3xl font-bold text-gray-100 font-mono">{analytics.totalFollowers}</p>
            <p className="text-sm text-gray-400 font-mono mt-1">Total followers</p>
          </ShadcnCardContent>
        </ShadcnCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Posts */}
        <ShadcnCard className="bg-gray-900 border-gray-700">
          <ShadcnCardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="text-terminal-green" size={20} />
              <h2 className="text-lg font-bold text-gray-100 font-mono">
                Top Performing Posts
              </h2>
            </div>

            {analytics.topPosts.length === 0 ? (
              <p className="text-gray-400 text-sm font-mono">No posts yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topPosts.map((post, index) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="p-3 bg-gray-800 border border-gray-700 rounded hover:border-terminal-green transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-terminal-green font-mono text-sm">#{index + 1}</span>
                          <h3 className="text-sm font-semibold text-gray-100 truncate">
                            {post.title}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono">
                          <span className="flex items-center space-x-1">
                            <Heart size={12} />
                            <span>{post.vote_count}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle size={12} />
                            <span>{post.comment_count}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ShadcnCardContent>
        </ShadcnCard>

        {/* Recent Activity */}
        <ShadcnCard className="bg-gray-900 border-gray-700">
          <ShadcnCardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="text-terminal-blue" size={20} />
              <h2 className="text-lg font-bold text-gray-100 font-mono">
                Recent Activity
              </h2>
            </div>

            {analytics.recentActivity.length === 0 ? (
              <p className="text-gray-400 text-sm font-mono">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {analytics.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-3 bg-gray-800 border border-gray-700 rounded"
                  >
                    <p className="text-sm text-gray-100 font-mono mb-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {formatDistanceToNow(activity.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ShadcnCardContent>
        </ShadcnCard>
      </div>
    </div>
  );
}
