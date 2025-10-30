/**
 * BlogOfTheDaySection Component - Daily Featured Blog Spotlight
 *
 * Full-width spotlight card for the blog of the day with:
 * - Shimmer animated "Blog of the Day" badge
 * - Large 16:9 cover image
 * - Extended excerpt (250 words)
 * - Author spotlight with bio
 * - Tags with navigation
 * - Social share buttons
 * - Engagement metrics
 * - Midnight auto-refresh
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Eye,
  Heart,
  MessageCircle,
  User,
  Calendar,
  Award,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useBlogOfTheDay } from '../../hooks/useBlogOfTheDay';
import { LazyImage } from '../performance/LazyImage';

interface BlogOfTheDaySectionProps {
  showAuthorBio?: boolean;
  showSocialShare?: boolean;
}

export const BlogOfTheDaySection = memo(function BlogOfTheDaySection({
  showAuthorBio = true,
  // showSocialShare reserved for future social sharing feature
}: BlogOfTheDaySectionProps) {
  const { blog, loading, error, refresh } = useBlogOfTheDay();

  // Loading state
  if (loading) {
    return <BlogOfTheDaySkeleton />;
  }

  // Error state
  if (error) {
    return (
      <section className="py-12 sm:py-16 bg-gray-950" aria-label="Blog of the day">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-mono font-semibold text-gray-100 mb-2">
              Error Loading Blog of the Day
            </h3>
            <p className="text-gray-400 mb-6 font-mono text-sm">
              {error.message || 'Failed to load blog of the day'}
            </p>
            <button
              onClick={() => refresh()}
              className="inline-flex items-center gap-2 bg-terminal-green text-gray-900 px-6 py-2 rounded font-mono font-semibold hover:bg-terminal-blue transition-colors"
            >
              <RefreshCw size={16} />
              retry()
            </button>
          </div>
        </div>
      </section>
    );
  }

  // No blog available
  if (!blog) {
    return null;
  }

  // Calculate reading time
  const readingTime = blog.reading_time_minutes || Math.ceil(blog.word_count / 200) || 5;

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get engagement data
  const viewCount = (blog as any).view_count || 0;
  const clapCount = (blog as any).clap_count || 0;
  const commentCount = (blog as any).comment_count || 0;

  // Format date
  const publishDate = new Date(blog.published_at || blog.created_at);
  const formattedDate = publishDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Create excerpt from HTML content (first 250 words)
  const createExcerpt = (html: string, wordLimit: number = 50): string => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text.split(' ');
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(' ') + '...'
      : text;
  };

  const excerpt = blog.summary || createExcerpt(blog.content_html, 50);

  return (
    <section
      className="py-16 sm:py-20 bg-gradient-to-b from-gray-950 via-gray-950/50 to-gray-950"
      aria-label="Blog of the day"
      data-testid="blog-of-day-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Award className="w-6 h-6 text-terminal-green animate-pulse" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 font-mono">
              <span className="text-terminal-green">$ </span>
              blog_of_the_day
              <span className="text-terminal-blue">()</span>
            </h2>
          </div>
          <p className="text-gray-400 font-mono text-sm">
            <span className="text-terminal-purple">#</span> Today's top pick based on engagement and quality
          </p>
        </div>

        {/* Blog Spotlight Card */}
        <article className="bg-gray-900 border-2 border-terminal-green/30 rounded-xl overflow-hidden hover:border-terminal-green hover:shadow-glow-green transition-all duration-500">
          {/* Badge Shimmer */}
          <div className="bg-gradient-to-r from-terminal-purple via-terminal-green to-terminal-blue bg-[length:200%_100%] animate-shimmer p-px">
            <div className="bg-gray-900 px-6 py-3 text-center">
              <div className="inline-flex items-center gap-2 font-mono font-bold text-terminal-green">
                <span className="text-2xl">🏆</span>
                <span>BLOG OF THE DAY</span>
                <span className="text-2xl">🏆</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 p-6 sm:p-8">
            {/* Left Column: Image */}
            <div className="relative aspect-video rounded-lg overflow-hidden">
              {blog.cover_image ? (
                <LazyImage
                  src={blog.cover_image}
                  alt={blog.cover_image_alt || blog.title}
                  className="w-full h-full object-cover"
                  placeholderClassName="w-full h-full"
                  onError={() => console.warn('Failed to load blog of the day image:', blog.slug)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-terminal-purple/20 to-terminal-blue/20 flex items-center justify-center">
                  <code className="text-4xl font-mono text-gray-600">{'<blog/>'}</code>
                </div>
              )}

              {/* Category Badge */}
              {blog.category && (
                <div className="absolute top-4 left-4">
                  <span className="inline-block bg-terminal-green/90 text-gray-900 px-3 py-1.5 rounded font-mono text-xs font-semibold backdrop-blur-sm">
                    {blog.category.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Right Column: Content */}
            <div className="flex flex-col">
              {/* Title */}
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-100 font-mono mb-3 hover:text-terminal-green transition-colors leading-tight">
                <Link to={`/blog/${blog.slug}`}>
                  {blog.title}
                </Link>
              </h3>

              {/* Excerpt */}
              <p className="text-gray-300 text-base mb-6 leading-relaxed flex-1">
                {excerpt}
              </p>

              {/* Author Info */}
              <div className="flex items-start gap-4 mb-6 p-4 bg-gray-950/50 rounded-lg border border-gray-800">
                {blog.author?.avatar_url ? (
                  <img
                    src={blog.author.avatar_url}
                    alt={blog.author.username}
                    className="w-16 h-16 rounded-full border-2 border-terminal-green object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-800 border-2 border-terminal-green rounded-full flex items-center justify-center">
                    <User className="text-terminal-green" size={28} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-mono font-semibold text-gray-100 mb-1">
                    @{blog.author?.username || 'anonymous'}
                  </p>
                  {showAuthorBio && blog.author?.bio && (
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {blog.author.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm font-mono text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-terminal-blue" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-terminal-purple" />
                  <span>{readingTime} min read</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-terminal-green" />
                  <span>Top pick</span>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="flex flex-wrap items-center gap-6 mb-6 pb-6 border-b border-gray-800">
                {viewCount > 0 && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Eye size={16} className="text-terminal-blue" />
                    <span className="font-mono text-sm">{formatNumber(viewCount)} views</span>
                  </div>
                )}
                {clapCount > 0 && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Heart size={16} className="text-terminal-purple" />
                    <span className="font-mono text-sm">{formatNumber(clapCount)} claps</span>
                  </div>
                )}
                {commentCount > 0 && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MessageCircle size={16} className="text-terminal-green" />
                    <span className="font-mono text-sm">{formatNumber(commentCount)} comments</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {blog.tags.slice(0, 5).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1 rounded font-mono text-xs hover:border-terminal-green hover:text-terminal-green transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA Button */}
              <Link
                to={`/blog/${blog.slug}`}
                className="inline-flex items-center justify-center gap-2 bg-terminal-green text-gray-900 px-8 py-3 rounded font-mono font-semibold hover:bg-terminal-blue transition-colors group"
              >
                <span>read_full_article()</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
});

/**
 * Skeleton loading state
 */
const BlogOfTheDaySkeleton = memo(function BlogOfTheDaySkeleton() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-950 via-gray-950/50 to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center mb-8">
          <div className="h-8 w-72 bg-gray-800 rounded animate-pulse mx-auto mb-4" />
          <div className="h-4 w-96 bg-gray-800 rounded animate-pulse mx-auto" />
        </div>

        {/* Card Skeleton */}
        <div className="bg-gray-900 border-2 border-gray-800 rounded-xl overflow-hidden">
          {/* Badge Skeleton */}
          <div className="bg-gray-800 p-4">
            <div className="h-6 w-64 bg-gray-700 rounded animate-pulse mx-auto" />
          </div>

          {/* Content Skeleton */}
          <div className="grid md:grid-cols-2 gap-6 p-6 sm:p-8">
            {/* Image Skeleton */}
            <div className="aspect-video bg-gray-800 rounded-lg animate-pulse" />

            {/* Text Content Skeleton */}
            <div className="space-y-4">
              <div className="h-10 bg-gray-800 rounded animate-pulse" />
              <div className="h-10 w-4/5 bg-gray-800 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-800 rounded animate-pulse" />
                <div className="h-4 bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="flex gap-4 p-4 bg-gray-950/50 rounded-lg">
                <div className="w-16 h-16 bg-gray-800 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-full bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-12 bg-terminal-green/20 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

/**
 * Shimmer animation CSS (add to globals.css)
 *
 * @keyframes shimmer {
 *   0% { background-position: 0% 50%; }
 *   50% { background-position: 100% 50%; }
 *   100% { background-position: 0% 50%; }
 * }
 *
 * .animate-shimmer {
 *   animation: shimmer 3s ease-in-out infinite;
 * }
 */
