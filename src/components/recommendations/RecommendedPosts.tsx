import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Sparkles } from 'lucide-react';
import { supabase, Post } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type RecommendedPostsProps = {
  currentPostId?: string;
  currentPostCategory?: string;
  currentPostTags?: string[];
  limit?: number;
};

export function RecommendedPosts({
  currentPostId,
  currentPostCategory,
  currentPostTags = [],
  limit = 5
}: RecommendedPostsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [user, currentPostId, currentPostCategory]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          subtitle,
          category,
          vote_count,
          comment_count,
          created_at,
          profiles:author_id (
            username,
            avatar_url
          )
        `)
        .eq('is_published', true)
        .order('vote_count', { ascending: false })
        .limit(limit);

      // Exclude current post if provided
      if (currentPostId) {
        query = query.neq('id', currentPostId);
      }

      // Filter by category if provided
      if (currentPostCategory) {
        query = query.eq('category', currentPostCategory);
      }

      const { data, error } = await query;

      if (error) throw error;

      // If we have tags, try to get posts with matching tags
      if (currentPostTags.length > 0) {
        const { data: taggedPosts } = await supabase
          .from('post_tags')
          .select(`
            post_id,
            posts (
              id,
              title,
              subtitle,
              category,
              vote_count,
              comment_count,
              created_at,
              profiles:author_id (
                username,
                avatar_url
              )
            )
          `)
          .in('tag_id', currentPostTags)
          .limit(limit);

        if (taggedPosts) {
          const taggedPostsData = taggedPosts
            .map(item => item.posts)
            .filter(post => post && post.id !== currentPostId);

          // Merge and deduplicate recommendations
          const allRecommendations = [...(data || []), ...taggedPostsData];
          const uniqueRecommendations = Array.from(
            new Map(allRecommendations.map(post => [post.id, post])).values()
          );

          setRecommendations(uniqueRecommendations.slice(0, limit));
        } else {
          setRecommendations(data || []);
        }
      } else {
        setRecommendations(data || []);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles size={18} className="text-terminal-purple" />
          <h3 className="font-semibold text-gray-100 font-mono">Recommended for you</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles size={18} className="text-terminal-purple" />
        <h3 className="font-semibold text-gray-100 font-mono">Recommended for you</h3>
      </div>
      <div className="space-y-4">
        {recommendations.map((post) => (
          <div
            key={post.id}
            onClick={() => navigate(`/post/${post.id}`)}
            className="cursor-pointer group"
          >
            <div className="flex items-start space-x-3">
              <TrendingUp size={14} className="text-terminal-green mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-100 group-hover:text-terminal-green transition-colors font-mono line-clamp-2">
                  {post.title}
                </h4>
                {post.subtitle && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-mono">
                    {post.subtitle}
                  </p>
                )}
                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-600 font-mono">
                  {post.category && (
                    <span className="text-terminal-purple">{post.category}</span>
                  )}
                  <span>{post.vote_count} votes</span>
                  <span>{post.comment_count} comments</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
