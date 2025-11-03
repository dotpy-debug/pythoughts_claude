/**
 * FeaturedBlogSection Component - Landing Page Featured Blogs
 *
 * Displays top 3 trending blogs from the last 7 days with:
 * - Hero card for #1 featured blog (full-width)
 * - Compact cards for #2 and #3 (side-by-side)
 * - Responsive layout (stacks on mobile)
 * - Auto-refresh every 5 minutes
 * - Skeleton loading states
 * - Error handling with graceful fallback
 */

import { memo } from 'react';
import { useFeaturedBlogs } from '../../hooks/useFeaturedBlogs';
import { BlogHeroCard } from './BlogHeroCard';
import { BlogCompactCard } from './BlogCompactCard';
import { FeaturedBlogSkeleton } from './FeaturedBlogSkeleton';
import { TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

interface FeaturedBlogSectionProperties {
  maxBlogs?: number;
  showEngagement?: boolean;
  autoRefresh?: boolean;
  category?: string;
}

export const FeaturedBlogSection = memo(function FeaturedBlogSection({
  maxBlogs = 3,
  showEngagement = true,
  autoRefresh = true,
  category,
}: FeaturedBlogSectionProperties) {
  const { blogs, loading, error, refresh } = useFeaturedBlogs({
    limit: maxBlogs,
    autoRefresh,
    category,
  });

  // Loading state
  if (loading && blogs.length === 0) {
    return <FeaturedBlogSkeleton count={maxBlogs} />;
  }

  // Error state with retry
  if (error && blogs.length === 0) {
    return (
      <section
        className="py-12 sm:py-16"
        aria-label="Featured blog posts"
        data-testid="featured-section"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-mono font-semibold text-gray-100 mb-2">
              Error Loading Featured Blogs
            </h3>
            <p className="text-gray-400 mb-6 font-mono text-sm">
              {error.message || 'Failed to load featured content'}
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

  // Empty state
  if (blogs.length === 0) {
    return null;
  }

  const [featuredBlog, ...remainingBlogs] = blogs;

  return (
    <section
      className="py-12 sm:py-16 bg-gray-950"
      aria-label="Featured blog posts"
      data-testid="featured-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 font-mono mb-2">
              <span className="text-terminal-green">$ </span>
              featured_blogs
              <span className="text-terminal-blue">()</span>
            </h2>
            <p className="text-gray-400 font-mono text-sm">
              <span className="text-terminal-purple">#</span> Top trending content from the past week
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-gray-500 text-xs font-mono">
            <TrendingUp size={14} className="text-terminal-green" />
            <span>auto-refresh: {autoRefresh ? 'true' : 'false'}</span>
          </div>
        </div>

        {/* Featured Blogs Grid */}
        <div className="space-y-6">
          {/* Hero Blog - Full Width */}
          {featuredBlog && (
            <div className="fade-in-up" style={{ animationDelay: '0ms' }}>
              <BlogHeroCard
                blog={featuredBlog}
                priority={true}
                showEngagement={showEngagement}
              />
            </div>
          )}

          {/* Remaining Blogs - Side by Side Grid */}
          {remainingBlogs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {remainingBlogs.map((blog, index) => (
                <div
                  key={blog.id}
                  className="fade-in-up"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <BlogCompactCard blog={blog} showEngagement={showEngagement} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View All Link */}
        <div className="mt-8 text-center">
          <a
            href="/blogs"
            className="inline-flex items-center gap-2 text-terminal-green hover:text-terminal-blue font-mono text-sm font-semibold transition-colors group"
          >
            <span>view_all_blogs()</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>
    </section>
  );
});

/**
 * Animation styles (add to globals.css or tailwind config)
 *
 * @keyframes fade-in-up {
 *   from {
 *     opacity: 0;
 *     transform: translateY(20px);
 *   }
 *   to {
 *     opacity: 1;
 *     transform: translateY(0);
 *   }
 * }
 *
 * .fade-in-up {
 *   animation: fade-in-up 0.6s ease-out forwards;
 *   opacity: 0;
 * }
 */
