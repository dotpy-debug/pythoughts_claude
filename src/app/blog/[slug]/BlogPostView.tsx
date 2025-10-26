'use client';

import { useEffect } from 'react';
import { BlogHero } from '../../../components/blog/reader/BlogHero';
import { FloatingTOC } from '../../../components/blog/toc/FloatingTOC';
import { BlogContent } from '../../../components/blog/reader/BlogContent';
import { EngagementBar } from '../../../components/blog/reader/EngagementBar';
import { CommentsPanel } from '../../../components/blog/reader/CommentsPanel';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content_html: string;
  content_json: any;
  toc_data: any;
  created_at: string;
  updated_at: string;
  published_at: string;
  reading_time: number;
  view_count: number;
  author_id: string;
  cover_image: string | null;
  tags: string[];
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface BlogPostViewProps {
  post: BlogPost;
}

export function BlogPostView({ post }: BlogPostViewProps) {
  // Set page title and meta description
  useEffect(() => {
    // Update document title for client-side navigation
    document.title = `${post.title} | Pythoughts`;
  }, [post.title]);

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Blog Hero */}
      <BlogHero post={post} />

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-8">
          {/* Blog Content */}
          <article className="prose prose-invert prose-terminal max-w-none">
            <BlogContent html={post.content_html} />
          </article>

          {/* Floating Table of Contents */}
          {post.toc_data && post.toc_data.length > 0 && (
            <aside className="hidden lg:block">
              <FloatingTOC items={post.toc_data} />
            </aside>
          )}
        </div>

        {/* Engagement Bar */}
        <div className="mt-12">
          <EngagementBar postId={post.id} />
        </div>

        {/* Comments Section */}
        <div className="mt-12">
          <CommentsPanel postId={post.id} />
        </div>
      </div>
    </div>
  );
}
