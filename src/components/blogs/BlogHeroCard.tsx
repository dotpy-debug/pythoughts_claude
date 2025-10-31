/**
 * BlogHeroCard Component - Featured Blog Display
 *
 * Large hero-style card for featured #1 blog on landing page
 * Features:
 * - Terminal-themed styling
 * - Lazy-loaded cover image with gradient overlay
 * - Engagement metrics (views, claps, comments)
 * - Author info with avatar
 * - Reading time and category badge
 * - Animated hover effects
 * - Responsive layout
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Eye, Heart, MessageCircle, User, ArrowRight } from 'lucide-react';
import { BlogPost } from '../../types/blog';
import { LazyImage } from '../performance/LazyImage';

interface BlogHeroCardProps {
  blog: BlogPost;
  priority?: boolean; // Preload image
  showEngagement?: boolean;
}

export const BlogHeroCard = memo(function BlogHeroCard({
  blog,
  priority = false,
  showEngagement = true,
}: BlogHeroCardProps) {
  // Calculate reading time if not available
  const readingTime = blog.reading_time_minutes || Math.ceil(blog.word_count / 200) || 5;

  // Format large numbers (e.g., 1.2K, 5.3M)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get view count from blog data (would need to be added to BlogPost type)
  const viewCount = (blog as { view_count?: number }).view_count || 0;
  const clapCount = (blog as { clap_count?: number }).clap_count || 0;
  const commentCount = (blog as { comment_count?: number }).comment_count || 0;

  // Format publish date
  const publishDate = new Date(blog.published_at || blog.created_at);
  const timeAgo = formatDistanceToNow(publishDate);

  return (
    <Link
      to={`/blog/${blog.slug}`}
      className="group relative bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-terminal-green hover:shadow-glow-green transition-all duration-300"
      aria-label={`Featured: ${blog.title}`}
    >
      {/* Cover Image with Gradient Overlay */}
      <div className="relative h-96 overflow-hidden">
        {blog.cover_image ? (
          <>
            {priority ? (
              <img
                src={blog.cover_image}
                alt={blog.cover_image_alt || blog.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  console.warn('Failed to load featured blog image:', blog.slug);
                }}
              />
            ) : (
              <LazyImage
                src={blog.cover_image}
                alt={blog.cover_image_alt || blog.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                placeholderClassName="w-full h-full"
                onError={() => console.warn('Failed to load featured blog image:', blog.slug)}
              />
            )}
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-terminal-purple/20 to-terminal-blue/20 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <code className="text-4xl font-mono">{'<blog/>'}</code>
            </div>
          </div>
        )}

        {/* Featured Badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center gap-1.5 bg-terminal-green/90 text-gray-900 px-3 py-1.5 rounded font-mono font-semibold text-xs backdrop-blur-sm">
            <span className="animate-pulse">★</span>
            FEATURED
          </span>
        </div>

        {/* Category Badge */}
        {blog.category && (
          <div className="absolute top-4 right-4">
            <span className="inline-block bg-gray-900/80 border border-terminal-blue text-terminal-blue px-3 py-1.5 rounded font-mono text-xs backdrop-blur-sm">
              {blog.category.toUpperCase()}
            </span>
          </div>
        )}

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-100 font-mono mb-4 group-hover:text-terminal-green transition-colors leading-tight">
            <span className="text-terminal-green">$ </span>
            {blog.title}
          </h2>

          {blog.summary && (
            <p className="text-gray-300 text-lg mb-6 line-clamp-2 max-w-3xl">
              {blog.summary}
            </p>
          )}

          {/* Author & Metadata */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              {blog.author?.avatar_url ? (
                <img
                  src={blog.author.avatar_url}
                  alt={blog.author.username}
                  className="w-12 h-12 rounded-full border-2 border-terminal-green object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-800 border-2 border-terminal-green rounded-full flex items-center justify-center">
                  <User className="text-terminal-green" size={24} />
                </div>
              )}
              <div>
                <p className="font-mono font-semibold text-gray-100 text-sm">
                  @{blog.author?.username || 'anonymous'}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono">
                  <span>{timeAgo}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span>{readingTime} min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Read More Button */}
            <div className="inline-flex items-center gap-2 text-terminal-green font-mono text-sm font-semibold group-hover:gap-3 transition-all">
              <span>read_more()</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Metrics Bar */}
      {showEngagement && (viewCount > 0 || clapCount > 0 || commentCount > 0) && (
        <div className="bg-gray-950/50 border-t border-gray-800 px-6 py-3">
          <div className="flex items-center gap-6 text-gray-400 font-mono text-sm">
            {viewCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Eye size={14} className="text-terminal-blue" />
                <span>{formatNumber(viewCount)}</span>
              </div>
            )}
            {clapCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Heart size={14} className="text-terminal-purple" />
                <span>{formatNumber(clapCount)}</span>
              </div>
            )}
            {commentCount > 0 && (
              <div className="flex items-center gap-1.5">
                <MessageCircle size={14} className="text-terminal-green" />
                <span>{formatNumber(commentCount)}</span>
              </div>
            )}
            {blog.tags && blog.tags.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                {blog.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs text-gray-500 hover:text-terminal-blue transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Link>
  );
});

/**
 * Helper function to format relative time
 */
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

/**
 * Hover glow effect (add to globals.css or tailwind config)
 *
 * .shadow-glow-green {
 *   box-shadow: 0 0 20px rgba(166, 227, 161, 0.3);
 * }
 */
