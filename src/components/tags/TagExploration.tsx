import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag as TagIcon, TrendingUp, Users, FileText, Search, Star } from 'lucide-react';
import { getPopularTags, getTrendingTags, followTag, unfollowTag, searchTags } from '../../actions/tags';
import type { TagWithStats } from '../../actions/tags';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../lib/logger';

export function TagExploration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [popularTags, setPopularTags] = useState<TagWithStats[]>([]);
  const [trendingTags, setTrendingTags] = useState<TagWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TagWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'popular' | 'trending'>('popular');
  const [followingTags, setFollowingTags] = useState<Set<string>>(new Set());

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const [popular, trending] = await Promise.all([
        getPopularTags(50, user?.id),
        getTrendingTags(10, 7),
      ]);

      setPopularTags(popular);
      setTrendingTags(trending);

      // Build following set
      if (user) {
        const following = new Set(
          popular.filter(t => t.is_following).map(t => t.id)
        );
        setFollowingTags(following);
      }
    } catch (error) {
      logger.error('Error loading tags', { errorDetails: error });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleSearch = useCallback(async () => {
    try {
      const results = await searchTags(searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      logger.error('Error searching tags', { errorDetails: error });
    }
  }, [searchQuery]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, handleSearch]);

  const handleFollowToggle = async (tagId: string) => {
    if (!user) {
      alert('Please sign in to follow tags');
      return;
    }

    const isFollowing = followingTags.has(tagId);

    try {
      if (isFollowing) {
        const result = await unfollowTag(tagId, user.id);
        if (result.success) {
          setFollowingTags(previous => {
            const next = new Set(previous);
            next.delete(tagId);
            return next;
          });
          // Update local state
          updateTagFollowState(tagId, false);
        }
      } else {
        const result = await followTag(tagId, user.id);
        if (result.success) {
          setFollowingTags(previous => new Set(previous).add(tagId));
          // Update local state
          updateTagFollowState(tagId, true);
        }
      }
    } catch (error) {
      logger.error('Error toggling tag follow', { errorDetails: error, tagId });
    }
  };

  const updateTagFollowState = (tagId: string, isFollowing: boolean) => {
    setPopularTags(previous =>
      previous.map(t =>
        t.id === tagId
          ? { ...t, is_following: isFollowing, follower_count: t.follower_count + (isFollowing ? 1 : -1) }
          : t
      )
    );
    setTrendingTags(previous =>
      previous.map(t =>
        t.id === tagId
          ? { ...t, is_following: isFollowing, follower_count: t.follower_count + (isFollowing ? 1 : -1) }
          : t
      )
    );
  };

  const handleTagClick = (slug: string) => {
    navigate(`/tags/${slug}`);
  };

  const displayTags = searchQuery.trim().length > 0
    ? searchResults
    : (activeTab === 'popular'
    ? popularTags
    : trendingTags);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({length: 6}).map((_, index) => (
          <div key={index} className="bg-gray-900 border border-gray-700 rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-gray-800 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-800 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 font-mono focus:outline-none focus:border-terminal-green"
        />
      </div>

      {/* Tabs */}
      {searchQuery.trim().length === 0 && (
        <div className="flex space-x-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 font-mono transition-colors ${
              activeTab === 'popular'
                ? 'text-terminal-green border-b-2 border-terminal-green'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Star className="inline mr-2" size={16} />
            Popular ({popularTags.length})
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 font-mono transition-colors ${
              activeTab === 'trending'
                ? 'text-terminal-green border-b-2 border-terminal-green'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <TrendingUp className="inline mr-2" size={16} />
            Trending ({trendingTags.length})
          </button>
        </div>
      )}

      {/* Tag Grid */}
      {displayTags.length === 0 ? (
        <div className="text-center py-20">
          <TagIcon size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-mono">
            {searchQuery.trim().length > 0 ? 'No tags found' : 'No tags available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayTags.map((tag) => {
            const isFollowing = user && followingTags.has(tag.id);

            return (
              <div
                key={tag.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-terminal-green transition-all cursor-pointer group"
                onClick={() => handleTagClick(tag.slug)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <TagIcon size={20} className="text-terminal-purple" />
                    <h3 className="text-lg font-semibold text-gray-100 font-mono group-hover:text-terminal-green transition-colors">
                      #{tag.name}
                    </h3>
                  </div>
                  {user && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowToggle(tag.id);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold font-mono transition-colors ${
                        isFollowing
                          ? 'bg-terminal-green text-gray-900 hover:bg-terminal-blue'
                          : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-terminal-green hover:text-terminal-green'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>

                {tag.description && (
                  <p className="text-sm text-gray-400 font-mono mb-3 line-clamp-2">
                    {tag.description}
                  </p>
                )}

                <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono">
                  <div className="flex items-center space-x-1">
                    <FileText size={14} className="text-terminal-blue" />
                    <span>{tag.post_count} posts</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users size={14} className="text-terminal-purple" />
                    <span>{tag.follower_count} followers</span>
                  </div>
                  {tag.recent_posts_count !== undefined && tag.recent_posts_count > 0 && (
                    <div className="flex items-center space-x-1">
                      <TrendingUp size={14} className="text-orange-500" />
                      <span>{tag.recent_posts_count} this week</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
