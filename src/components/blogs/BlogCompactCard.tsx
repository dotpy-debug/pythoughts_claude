/**
 * BlogCompactCard Component - Compact Featured Blog Display
 *
 * Compact card for featured #2 and #3 blogs
 * Features:
 * - Terminal-themed styling
 * - Smaller image (h-48 vs h-96)
 * - Compact layout
 * - Engagement metrics
 * - Author info
 * - Hover effects
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Eye, Heart, MessageCircle, User } from 'lucide-react';
import { BlogPost } from '../../types/blog';
import { LazyImage } from '../performance/LazyImage';

interface BlogCompactCardProperties {
  blog: BlogPost;
  showEngagement?: boolean;
}

export const BlogCompactCard = memo(function BlogCompactCard({
  blog,
  showEngagement = true,
}: BlogCompactCardProperties) {
  // Calculate reading time if not available
  const readingTime = blog.reading_time_minutes || Math.ceil(blog.word_count / 200) || 5;

  // Format large numbers
  const formatNumber = (number_: number): string => {
    if (number_ >= 1_000_000) return `${(number_ / 1_000_000).toFixed(1)}M`;
    if (number_ >= 1000) return `${(number_ / 1000).toFixed(1)}K`;
    return number_.toString();
  };

  // Get engagement data
  const viewCount = (blog as { view_count?: number }).view_count || 0;
  const clapCount = (blog as { clap_count?: number }).clap_count || 0;
  const commentCount = (blog as { comment_count?: number }).comment_count || 0;

  // Format publish date
  const publishDate = new Date(blog.published_at || blog.created_at);
  const timeAgo = formatDistanceToNow(publishDate);

  return (
    <Link
      to={`/blog/${blog.slug}`}
      className="group block bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-terminal-green hover:shadow-glow-green transition-all duration-300 h-full"
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden">
        {blog.cover_image ? (
          <LazyImage
            src={blog.cover_image}
            alt={blog.cover_image_alt || blog.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            placeholderClassName="w-full h-full"
            onError={() => console.warn('Failed to load blog image:', blog.slug)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-terminal-purple/20 to-terminal-blue/20 flex items-center justify-center">
            <code className="text-2xl font-mono text-gray-600">{'<blog/>'}</code>
          </div>
        )}

        {/* Category Badge */}
        {blog.category && (
          <div className="absolute top-3 right-3">
            <span className="inline-block bg-gray-900/80 border border-terminal-blue text-terminal-blue px-2 py-1 rounded font-mono text-xs backdrop-blur-sm">
              {blog.category.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-100 font-mono mb-2 line-clamp-2 group-hover:text-terminal-green transition-colors leading-snug">
          {blog.title}
        </h3>

        {/* Summary */}
        {blog.summary && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
            {blog.summary}
          </p>
        )}

        {/* Author & Metadata */}
        <div className="flex items-center space-x-3 mb-4">
          {blog.author?.avatar_url ? (
            <img
              src={blog.author.avatar_url}
              alt={blog.author.username}
              className="w-8 h-8 rounded-full border border-terminal-green object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-800 border border-terminal-green rounded-full flex items-center justify-center">
              <User className="text-terminal-green" size={14} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-mono font-semibold text-gray-100 text-xs truncate">
              @{blog.author?.username || 'anonymous'}
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-500 font-mono">
              <span>{timeAgo}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Clock size={10} />
                <span>{readingTime}min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        {showEngagement && (viewCount > 0 || clapCount > 0 || commentCount > 0) && (
          <div className="pt-4 border-t border-gray-800">
            <div className="flex items-center gap-4 text-gray-500 font-mono text-xs">
              {viewCount > 0 && (
                <div className="flex items-center gap-1">
                  <Eye size={12} className="text-terminal-blue" />
                  <span>{formatNumber(viewCount)}</span>
                </div>
              )}
              {clapCount > 0 && (
                <div className="flex items-center gap-1">
                  <Heart size={12} className="text-terminal-purple" />
                  <span>{formatNumber(clapCount)}</span>
                </div>
              )}
              {commentCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageCircle size={12} className="text-terminal-green" />
                  <span>{formatNumber(commentCount)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {blog.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs text-gray-600 hover:text-terminal-blue transition-colors font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
});

/**
 * Helper function to format relative time
 */
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86_400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2_592_000) return `${Math.floor(diffInSeconds / 86_400)}d`;
  if (diffInSeconds < 31_536_000) return `${Math.floor(diffInSeconds / 2_592_000)}mo`;
  return `${Math.floor(diffInSeconds / 31_536_000)}y`;
}
