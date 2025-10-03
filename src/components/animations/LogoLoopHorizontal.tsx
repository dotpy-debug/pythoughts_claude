import { TrendingUp, MessageCircle, ArrowUp, Flame } from 'lucide-react';
import { useTrending } from '../../hooks/useTrending';
import { formatDistanceToNow } from '../../utils/dateUtils';

export function LogoLoopHorizontal() {
  const { posts, loading, error } = useTrending({ limit: 10, autoRefresh: true });

  if (loading && posts.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 overflow-hidden z-40">
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center space-x-2 text-terminal-green">
            <Flame size={20} className="animate-pulse" />
            <span className="text-sm font-mono">Loading trending posts...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 overflow-hidden z-40">
        <div className="flex items-center justify-center h-full">
          <span className="text-sm font-mono text-red-400">Error loading trending posts</span>
        </div>
      </div>
    );
  }

  // Duplicate posts for seamless scrolling
  const scrollingPosts = posts.length > 0 ? [...posts, ...posts, ...posts] : [];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 overflow-hidden z-40">
      <div className="flex items-center h-full">
        {/* Trending Header */}
        <div className="flex-shrink-0 px-6 border-r border-gray-700 h-full flex items-center space-x-2">
          <TrendingUp size={20} className="text-terminal-green" />
          <span className="text-sm font-mono text-terminal-green font-bold">TRENDING NOW</span>
        </div>

        {/* Scrolling Trending Posts */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center h-full animate-scroll-horizontal">
            {scrollingPosts.map((post, index) => (
              <div
                key={`${post.id}-${index}`}
                className="flex-shrink-0 px-6 h-full flex items-center space-x-3 border-r border-gray-700/50 hover:bg-gray-800/50 transition-colors cursor-pointer group"
                onClick={() => {
                  // Navigate to post detail - implement your navigation logic here
                  console.log('Navigate to post:', post.id);
                }}
              >
                {/* Trending Indicator */}
                <div className="flex items-center space-x-1">
                  <Flame size={16} className="text-orange-500 group-hover:animate-pulse" />
                  <span className="text-xs font-mono text-orange-400 font-bold">
                    #{index % posts.length + 1}
                  </span>
                </div>

                {/* Post Title */}
                <span className="text-sm font-mono text-gray-100 group-hover:text-terminal-green transition-colors max-w-xs truncate">
                  {post.title}
                </span>

                {/* Stats */}
                <div className="flex items-center space-x-3 text-xs font-mono text-gray-500">
                  <div className="flex items-center space-x-1">
                    <ArrowUp size={12} className="text-terminal-green" />
                    <span>{post.vote_count}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle size={12} className="text-terminal-blue" />
                    <span>{post.comment_count}</span>
                  </div>
                  <span className="text-gray-600">{formatDistanceToNow(post.created_at)}</span>
                </div>

                {/* Category Badge */}
                {post.category && (
                  <span className="text-xs bg-terminal-purple/20 text-terminal-purple px-2 py-0.5 rounded font-mono border border-terminal-purple/30">
                    {post.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
