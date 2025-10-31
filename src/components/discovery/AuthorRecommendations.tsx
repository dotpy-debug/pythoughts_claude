import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, Award, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeURL } from '../../utils/security';
import { logger } from '../../lib/logger';

type AuthorRecommendation = {
  id: string;
  username: string;
  display_username: string | null;
  avatar_url: string | null;
  bio: string | null;
  post_count: number;
  follower_count: number;
  reputation_points: number;
  level: number;
  is_following: boolean;
};

export function AuthorRecommendations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authors, setAuthors] = useState<AuthorRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  const loadAuthors = useCallback(async () => {
    setLoading(true);
    try {
      // Get authors with high engagement
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profile_extended')
        .select(`
          user_id,
          total_posts,
          total_followers,
          profiles!inner (
            id,
            username,
            display_username,
            avatar_url,
            bio
          )
        `)
        .gte('total_posts', 3)
        .order('total_followers', { ascending: false })
        .limit(20);

      if (profilesError) throw profilesError;

      if (!profilesData || profilesData.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = profilesData.map(p => p.user_id);

      // Get reputation data
      const { data: reputationData } = await supabase
        .from('user_reputation')
        .select('user_id, reputation_points, level')
        .in('user_id', userIds);

      const reputationMap = new Map(
        (reputationData || []).map(r => [r.user_id, r])
      );

      // Get current user's following list
      let followingIds = new Set<string>();
      if (user) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followData) {
          followingIds = new Set(followData.map(f => f.following_id));
          setFollowingSet(followingIds);
        }
      }

      // Build author recommendations
      const recommendations: AuthorRecommendation[] = profilesData
        .map(item => {
          const profile = Array.isArray(item.profiles)
            ? item.profiles[0]
            : item.profiles;

          if (!profile) return null;

          const reputation = reputationMap.get(item.user_id);

          return {
            id: profile.id,
            username: profile.username,
            display_username: profile.display_username,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            post_count: item.total_posts || 0,
            follower_count: item.total_followers || 0,
            reputation_points: reputation?.reputation_points || 0,
            level: reputation?.level || 1,
            is_following: user ? followingIds.has(profile.id) : false,
          };
        })
        .filter((author): author is AuthorRecommendation => author !== null)
        .filter(author => !user || author.id !== user.id) // Exclude current user
        .sort((a, b) => {
          // Score based on followers, posts, and reputation
          const scoreA = a.follower_count * 2 + a.post_count * 5 + a.reputation_points * 0.1;
          const scoreB = b.follower_count * 2 + b.post_count * 5 + b.reputation_points * 0.1;
          return scoreB - scoreA;
        })
        .slice(0, 12);

      setAuthors(recommendations);
    } catch (error) {
      logger.error('Error loading author recommendations', { errorDetails: error });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAuthors();
  }, [loadAuthors]);

  const handleFollow = async (authorId: string) => {
    if (!user) {
      alert('Please sign in to follow authors');
      return;
    }

    try {
      const isFollowing = followingSet.has(authorId);

      if (isFollowing) {
        // Unfollow
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', authorId);

        setFollowingSet(prev => {
          const next = new Set(prev);
          next.delete(authorId);
          return next;
        });

        setAuthors(prev =>
          prev.map(a =>
            a.id === authorId
              ? { ...a, is_following: false, follower_count: Math.max(0, a.follower_count - 1) }
              : a
          )
        );
      } else {
        // Follow
        await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: authorId });

        setFollowingSet(prev => new Set(prev).add(authorId));

        setAuthors(prev =>
          prev.map(a =>
            a.id === authorId
              ? { ...a, is_following: true, follower_count: a.follower_count + 1 }
              : a
          )
        );
      }
    } catch (error) {
      logger.error('Error toggling follow', { errorDetails: error, authorId });
    }
  };

  const getLevelColor = (level: number): string => {
    const colors = {
      1: '#9ca3af',
      2: '#3b82f6',
      3: '#8b5cf6',
      4: '#f59e0b',
      5: '#ef4444',
    };
    return colors[level as keyof typeof colors] || colors[1];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-800 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-800 rounded w-1/3"></div>
                <div className="h-3 bg-gray-800 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (authors.length === 0) {
    return (
      <div className="text-center py-20">
        <Users size={48} className="text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 font-mono">No author recommendations available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100 font-mono mb-2">
          <span className="text-terminal-green">$</span> recommended_authors
        </h2>
        <p className="text-gray-400 font-mono text-sm">
          Discover talented writers and thought leaders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {authors.map((author) => (
          <div
            key={author.id}
            className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-terminal-green transition-all group"
          >
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div
                onClick={() => navigate(`/user/${author.username}`)}
                className="cursor-pointer"
              >
                {author.avatar_url ? (
                  <img
                    src={sanitizeURL(author.avatar_url)}
                    alt={author.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-terminal-purple"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-800 border-2 border-terminal-purple rounded-full flex items-center justify-center">
                    <User size={32} className="text-terminal-purple" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div
                  onClick={() => navigate(`/user/${author.username}`)}
                  className="cursor-pointer mb-2"
                >
                  <h3 className="text-lg font-semibold text-gray-100 font-mono group-hover:text-terminal-green transition-colors">
                    {author.display_username || author.username}
                  </h3>
                  <p className="text-sm text-gray-500 font-mono">@{author.username}</p>
                </div>

                {author.bio && (
                  <p className="text-sm text-gray-400 font-mono line-clamp-2 mb-3">
                    {author.bio}
                  </p>
                )}

                <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono mb-3">
                  <div className="flex items-center space-x-1">
                    <FileText size={14} className="text-terminal-blue" />
                    <span>{author.post_count} posts</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users size={14} className="text-terminal-purple" />
                    <span>{author.follower_count} followers</span>
                  </div>
                  {author.level > 1 && (
                    <div className="flex items-center space-x-1">
                      <Award size={14} style={{ color: getLevelColor(author.level) }} />
                      <span style={{ color: getLevelColor(author.level) }}>Lvl {author.level}</span>
                    </div>
                  )}
                </div>

                {user && (
                  <button
                    onClick={() => handleFollow(author.id)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-semibold font-mono transition-colors ${
                      author.is_following
                        ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-red-500 hover:text-red-400'
                        : 'bg-terminal-green text-gray-900 hover:bg-terminal-blue'
                    }`}
                  >
                    {author.is_following ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
