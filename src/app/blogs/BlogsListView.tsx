'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, Eye, Tag } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  published_at: string;
  reading_time: number;
  view_count: number;
  tags: string[];
  author: {
    username: string;
    avatar_url: string | null;
  };
}

interface BlogsListViewProps {
  posts: BlogPost[];
}

export function BlogsListView({ posts }: BlogsListViewProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get all unique tags
  const allTags = Array.from(
    new Set(posts.flatMap((post) => post.tags || []))
  ).sort();

  // Filter posts by selected tag
  const filteredPosts = selectedTag
    ? posts.filter((post) => post.tags?.includes(selectedTag))
    : posts;

  return (
    <div className="min-h-screen bg-[#0d1117] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-terminal-green mb-4">
            Blog Posts
          </h1>
          <p className="text-lg text-terminal-green/70">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
            {selectedTag && ` tagged with "${selectedTag}"`}
          </p>
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTag === null
                  ? 'bg-terminal-green text-black'
                  : 'bg-terminal-green/10 text-terminal-green hover:bg-terminal-green/20'
              }`}
            >
              All Posts
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-terminal-green text-black'
                    : 'bg-terminal-green/10 text-terminal-green hover:bg-terminal-green/20'
                }`}
              >
                <Tag className="w-4 h-4 inline mr-1" />
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Blog Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-terminal-green/70 text-lg">
              No blog posts found
              {selectedTag && ` with tag "${selectedTag}"`}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-black border-2 border-terminal-green/30 rounded-lg overflow-hidden hover:border-terminal-green transition-all duration-300 hover:scale-105"
              >
                {/* Cover Image */}
                {post.cover_image && (
                  <div className="aspect-video bg-terminal-green/5 overflow-hidden relative">
                    <Image
                      src={post.cover_image}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  {/* Title */}
                  <h2 className="text-xl font-bold text-terminal-green mb-2 group-hover:text-terminal-green/80 line-clamp-2">
                    {post.title}
                  </h2>

                  {/* Subtitle */}
                  {post.subtitle && (
                    <p className="text-terminal-green/70 text-sm mb-4 line-clamp-2">
                      {post.subtitle}
                    </p>
                  )}

                  {/* Meta Information */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-terminal-green/60 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.published_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.reading_time} min read
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {post.view_count.toLocaleString()} views
                    </div>
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-terminal-green/10 text-terminal-green text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="px-2 py-1 text-terminal-green/60 text-xs">
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
