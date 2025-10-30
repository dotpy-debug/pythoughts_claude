/**
 * LatestBlogsSection Component - Recent Blog Posts Grid
 *
 * Displays latest published blogs in a compact grid with:
 * - 6 latest blogs (configurable)
 * - Compact card layout
 * - Category filter tabs
 * - Responsive grid (2 cols mobile, 3 tablet, 4 desktop)
 * - Skeleton loading states
 * - "View All" link to /blogs
 */

import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLatestBlogs } from '../../services/featured';
import { BlogPost } from '../../types/blog';
import { Clock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { LazyImage } from '../performance/LazyImage';

interface LatestBlogsSectionProps {
  maxBlogs?: number;
}

export const LatestBlogsSection = memo(function LatestBlogsSection({
  maxBlogs = 6,
}: LatestBlogsSectionProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch latest blogs on mount
  React.useEffect(() => {
    async function fetchBlogs() {
      try {
        const fetchedBlogs = await getLatestBlogs(maxBlogs);
        setBlogs(fetchedBlogs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load blogs'));
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, [maxBlogs]);

  // Loading state
  if (loading) {
    return <LatestBlogsSkeleton count={maxBlogs} />;
  }

  // Error state
  if (error) {
    return (
      <section className="py-12 sm:py-16 bg-gray-950" aria-label="Latest blog posts">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-mono font-semibold text-gray-100 mb-2">
              Error Loading Latest Blogs
            </h3>
            <p className="text-gray-400 font-mono text-sm">{error.message}</p>
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (blogs.length === 0) {
    return null;
  }

  return (
    <section
      className="py-12 sm:py-16 bg-gray-950"
      aria-label="Latest blog posts"
      data-testid="latest-blogs-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 font-mono mb-2">
              <span className="text-terminal-green">$ </span>
              latest_blogs
              <span className="text-terminal-blue">()</span>
            </h2>
            <p className="text-gray-400 font-mono text-sm">
              <span className="text-terminal-purple">#</span> Fresh content from our community
            </p>
          </div>
        </div>

        {/* Blogs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog, index) => (
            <div
              key={blog.id}
              className="fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <LatestBlogCard blog={blog} />
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-8 text-center">
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-blue font-mono text-sm font-semibold transition-colors group"
          >
            <span>explore_all_blogs()</span>
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>
      </div>
    </section>
  );
});

/**
 * Compact blog card for latest blogs grid
 */
interface LatestBlogCardProps {
  blog: BlogPost;
}

const LatestBlogCard = memo(function LatestBlogCard({ blog }: LatestBlogCardProps) {
  const readingTime = blog.reading_time_minutes || Math.ceil(blog.word_count / 200) || 5;
  const publishDate = new Date(blog.published_at || blog.created_at);
  const timeAgo = formatDistanceToNow(publishDate);

  return (
    <Link
      to={`/blog/${blog.slug}`}
      className="group block bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-terminal-green hover:shadow-glow-green transition-all duration-300 h-full"
    >
      {/* Cover Image */}
      <div className="relative h-40 overflow-hidden">
        {blog.cover_image ? (
          <LazyImage
            src={blog.cover_image}
            alt={blog.cover_image_alt || blog.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            placeholderClassName="w-full h-full"
            onError={() => console.warn('Failed to load latest blog image:', blog.slug)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-terminal-purple/20 to-terminal-blue/20 flex items-center justify-center">
            <code className="text-lg font-mono text-gray-600">{'<blog/>'}</code>
          </div>
        )}

        {/* Category Badge */}
        {blog.category && (
          <div className="absolute top-2 right-2">
            <span className="inline-block bg-gray-900/80 border border-terminal-blue text-terminal-blue px-2 py-0.5 rounded font-mono text-xs backdrop-blur-sm">
              {blog.category.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-base font-bold text-gray-100 font-mono mb-2 line-clamp-2 group-hover:text-terminal-green transition-colors leading-snug">
          {blog.title}
        </h3>

        {/* Author & Metadata */}
        <div className="flex items-center space-x-2 text-xs text-gray-500 font-mono">
          <div className="flex items-center space-x-1">
            {blog.author?.avatar_url ? (
              <img
                src={blog.author.avatar_url}
                alt={blog.author.username}
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <User size={12} className="text-gray-600" />
            )}
            <span className="truncate max-w-[100px]">
              @{blog.author?.username || 'anonymous'}
            </span>
          </div>
          <span>•</span>
          <span>{timeAgo}</span>
          <span>•</span>
          <div className="flex items-center space-x-1">
            <Clock size={10} />
            <span>{readingTime}m</span>
          </div>
        </div>
      </div>
    </Link>
  );
});

/**
 * Skeleton loading state
 */
interface LatestBlogsSkeletonProps {
  count?: number;
}

const LatestBlogsSkeleton = memo(function LatestBlogsSkeleton({
  count = 6,
}: LatestBlogsSkeletonProps) {
  return (
    <section className="py-12 sm:py-16 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
            >
              <div className="h-40 bg-gray-800 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-full bg-gray-800 rounded animate-pulse" />
                <div className="h-5 w-3/4 bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Link Skeleton */}
        <div className="mt-8 text-center">
          <div className="h-5 w-48 bg-gray-800 rounded animate-pulse mx-auto" />
        </div>
      </div>
    </section>
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
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo`;
  return `${Math.floor(diffInSeconds / 31536000)}y`;
}

// Add React import for useEffect
import React from 'react';
