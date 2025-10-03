import { TrendingUp, Flame, ArrowUp } from 'lucide-react';
import { useTrending } from '../../hooks/useTrending';

export function LogoLoopVertical() {
  const { posts, loading, error } = useTrending({ limit: 8, autoRefresh: true });

  if (loading && posts.length === 0) {
    return (
      <div className="fixed right-0 top-0 bottom-24 w-16 bg-gray-900/80 backdrop-blur-sm border-l border-gray-800 overflow-hidden z-40">
        <div className="flex items-center justify-center h-full">
          <Flame size={20} className="text-terminal-green animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed right-0 top-0 bottom-24 w-16 bg-gray-900/80 backdrop-blur-sm border-l border-gray-800 overflow-hidden z-40">
        <div className="flex items-center justify-center h-full">
          <TrendingUp size={20} className="text-red-400" />
        </div>
      </div>
    );
  }

  // Duplicate posts for seamless scrolling
  const scrollingPosts = posts.length > 0 ? [...posts, ...posts, ...posts] : [];

  return (
    <div className="fixed right-0 top-0 bottom-24 w-16 bg-gray-900/80 backdrop-blur-sm border-l border-gray-800 overflow-hidden z-40">
      <div className="flex flex-col h-full">
        {/* Trending Header */}
        <div className="flex-shrink-0 h-16 border-b border-gray-700 flex items-center justify-center">
          <TrendingUp size={20} className="text-terminal-green" />
        </div>

        {/* Scrolling Trending Posts */}
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col items-center animate-scroll-vertical">
            {scrollingPosts.map((post, index) => (
              <div
                key={`${post.id}-${index}`}
                className="flex-shrink-0 h-20 w-full flex flex-col items-center justify-center border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors cursor-pointer group relative"
                onClick={() => {
                  // Navigate to post detail - implement your navigation logic here
                  console.log('Navigate to post:', post.id);
                }}
                title={`${post.title} (${post.vote_count} votes)`}
              >
                {/* Trending Position */}
                <div className="absolute top-1 left-1 text-[10px] font-mono text-orange-400 font-bold">
                  #{index % posts.length + 1}
                </div>

                {/* Flame Icon */}
                <Flame size={16} className="text-orange-500 mb-1 group-hover:animate-pulse" />

                {/* Vote Count */}
                <div className="flex items-center space-x-0.5">
                  <ArrowUp size={10} className="text-terminal-green" />
                  <span className="text-[10px] font-mono text-gray-400">{post.vote_count}</span>
                </div>

                {/* Category Indicator (as colored dot) */}
                {post.category && (
                  <div
                    className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-terminal-purple"
                    title={post.category}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
