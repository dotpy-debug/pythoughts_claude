/**
 * FeaturedBlogSkeleton Component - Loading State
 *
 * Skeleton loading placeholders for featured blogs section
 * Matches the layout structure of FeaturedBlogSection with:
 * - Large hero skeleton (h-96)
 * - Compact skeletons for #2 and #3 (h-48)
 * - Animated pulse effect
 * - Responsive layout
 */

import { memo } from 'react';

interface FeaturedBlogSkeletonProps {
  count?: number;
}

export const FeaturedBlogSkeleton = memo(function FeaturedBlogSkeleton({
  count = 3,
}: FeaturedBlogSkeletonProps) {
  const showHero = count >= 1;
  const showCompact = count > 1;
  const compactCount = Math.min(count - 1, 2);

  return (
    <section
      className="py-12 sm:py-16 bg-gray-950"
      aria-label="Loading featured blogs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Featured Blogs Grid Skeleton */}
        <div className="space-y-6">
          {/* Hero Blog Skeleton - Full Width */}
          {showHero && <HeroBlogSkeleton />}

          {/* Compact Blogs Skeleton - Side by Side */}
          {showCompact && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: compactCount }).map((_, index) => (
                <CompactBlogSkeleton key={index} />
              ))}
            </div>
          )}
        </div>

        {/* View All Link Skeleton */}
        <div className="mt-8 text-center">
          <div className="h-5 w-40 bg-gray-800 rounded animate-pulse mx-auto" />
        </div>
      </div>
    </section>
  );
});

/**
 * Hero Blog Skeleton - Large featured blog placeholder
 */
const HeroBlogSkeleton = memo(function HeroBlogSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Image Skeleton */}
      <div className="relative h-96 bg-gray-800 animate-pulse">
        {/* Featured Badge Skeleton */}
        <div className="absolute top-4 left-4 h-7 w-24 bg-gray-700 rounded animate-pulse" />

        {/* Category Badge Skeleton */}
        <div className="absolute top-4 right-4 h-7 w-16 bg-gray-700 rounded animate-pulse" />

        {/* Content Overlay Skeleton */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          {/* Title Skeleton */}
          <div className="space-y-3 mb-4">
            <div className="h-10 w-full bg-gray-700 rounded animate-pulse" />
            <div className="h-10 w-4/5 bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Summary Skeleton */}
          <div className="space-y-2 mb-6">
            <div className="h-5 w-full bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-3/4 bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Author & Metadata Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Avatar Skeleton */}
              <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse" />
              {/* Author Info Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            {/* Read More Skeleton */}
            <div className="h-5 w-28 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Engagement Bar Skeleton */}
      <div className="bg-gray-950/50 border-t border-gray-800 px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="h-4 w-12 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-800 rounded animate-pulse" />
          <div className="ml-auto flex gap-2">
            <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Compact Blog Skeleton - Smaller featured blog placeholder
 */
const CompactBlogSkeleton = memo(function CompactBlogSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden h-full">
      {/* Image Skeleton */}
      <div className="relative h-48 bg-gray-800 animate-pulse">
        {/* Category Badge Skeleton */}
        <div className="absolute top-3 right-3 h-6 w-14 bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Content Skeleton */}
      <div className="p-5">
        {/* Title Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-6 w-full bg-gray-800 rounded animate-pulse" />
          <div className="h-6 w-3/4 bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Summary Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Author & Metadata Skeleton */}
        <div className="flex items-center space-x-3 mb-4">
          {/* Avatar Skeleton */}
          <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse" />
          {/* Author Info Skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-32 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Engagement Metrics Skeleton */}
        <div className="pt-4 border-t border-gray-800">
          <div className="flex items-center gap-4">
            <div className="h-3 w-10 bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-10 bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-10 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Tags Skeleton */}
        <div className="mt-4 flex gap-2">
          <div className="h-3 w-12 bg-gray-800 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
          <div className="h-3 w-14 bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
});
