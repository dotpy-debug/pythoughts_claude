import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Hash, ChevronRight } from 'lucide-react';
import { getTrendingTags } from '../../actions/tags';
import type { TagWithStats } from '../../actions/tags';
import { logger } from '../../lib/logger';

interface TrendingTopicsProps {
  limit?: number;
  compact?: boolean;
}

export function TrendingTopics({ limit = 5, compact = false }: TrendingTopicsProps) {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<TagWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingTopics();

    // Refresh every 5 minutes
    const interval = setInterval(loadTrendingTopics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [limit]);

  const loadTrendingTopics = async () => {
    try {
      const trending = await getTrendingTags(limit, 7);
      setTopics(trending);
    } catch (error) {
      logger.error('Error loading trending topics', { errorDetails: error });
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (slug: string) => {
    navigate(`/tags/${slug}`);
  };

  const handleViewAll = () => {
    navigate('/explore?tab=tags');
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp size={18} className="text-orange-500" />
          <h3 className="font-semibold text-gray-100 font-mono">Trending Topics</h3>
        </div>
        <div className="space-y-3">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-3">
          <TrendingUp size={14} className="text-orange-500" />
          <span className="text-xs font-semibold text-gray-100 font-mono uppercase tracking-wide">
            Trending
          </span>
        </div>
        <div className="space-y-1">
          {topics.slice(0, 3).map((topic, index) => (
            <button
              key={topic.id}
              onClick={() => handleTopicClick(topic.slug)}
              className="w-full text-left px-2 py-1 rounded text-xs font-mono text-gray-300 hover:bg-gray-800 hover:text-terminal-green transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-gray-600 font-bold">#{index + 1}</span>
                <Hash size={10} className="text-terminal-purple flex-shrink-0" />
                <span className="truncate">{topic.name}</span>
              </div>
              {topic.recent_posts_count && topic.recent_posts_count > 0 && (
                <span className="text-orange-400 text-xs ml-2 flex-shrink-0">
                  +{topic.recent_posts_count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <TrendingUp size={18} className="text-orange-500" />
          <h3 className="font-semibold text-gray-100 font-mono">Trending Topics</h3>
        </div>
        <button
          onClick={handleViewAll}
          className="text-xs text-terminal-blue hover:text-terminal-green transition-colors font-mono"
        >
          View all
        </button>
      </div>

      <div className="space-y-3">
        {topics.map((topic, index) => (
          <div
            key={topic.id}
            onClick={() => handleTopicClick(topic.slug)}
            className="cursor-pointer group"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 group-hover:border-orange-500 transition-colors">
                <span className="text-xs font-bold text-gray-400 group-hover:text-orange-500 font-mono">
                  #{index + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Hash size={12} className="text-terminal-purple flex-shrink-0" />
                  <h4 className="text-sm font-medium text-gray-100 group-hover:text-terminal-green transition-colors font-mono truncate">
                    {topic.name}
                  </h4>
                </div>

                <div className="flex items-center space-x-3 text-xs text-gray-600 font-mono">
                  <span>{topic.post_count} posts</span>
                  {topic.recent_posts_count && topic.recent_posts_count > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-orange-400">
                        +{topic.recent_posts_count} this week
                      </span>
                    </>
                  )}
                </div>

                {topic.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-mono">
                    {topic.description}
                  </p>
                )}
              </div>

              <ChevronRight size={14} className="text-gray-600 group-hover:text-terminal-green transition-colors flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleViewAll}
        className="w-full mt-4 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 hover:bg-gray-750 hover:border-terminal-green hover:text-terminal-green transition-all"
      >
        Explore All Tags
      </button>
    </div>
  );
}
