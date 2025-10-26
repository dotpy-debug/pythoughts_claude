/**
 * Blog Post Reader Page
 *
 * Full blog post reading experience with:
 * - FloatingTOC
 * - BlogHero
 * - BlogContent with prose styles
 * - EngagementBar
 * - CommentsPanel
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { BlogPost } from '../types/blog';
import { FloatingTOC } from '../components/blog/toc/FloatingTOC';
import { BlogHero } from '../components/blog/reader/BlogHero';
import { BlogContent } from '../components/blog/reader/BlogContent';
import { EngagementBar } from '../components/blog/reader/EngagementBar';
import { CommentsPanel } from '../components/blog/reader/CommentsPanel';
import { supabase } from '../lib/supabase';
import { usePostView } from '../hooks/usePostView';

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Track post view
  usePostView(post?.id);

  useEffect(() => {
    if (!slug) return;

    const loadPost = async () => {
      try {
        setLoading(true);

        // Fetch blog post by slug
        const { data, error } = await supabase
          .from('posts')
          .select(
            `
            *,
            profiles:author_id (
              id,
              username,
              avatar_url,
              bio
            )
          `
          )
          .eq('slug', slug)
          .eq('post_type', 'blog')
          .eq('status', 'published')
          .single();

        if (error) {
          console.error('Error loading blog post:', error);
          navigate('/404');
          return;
        }

        // Transform to BlogPost type
        const blogPost: BlogPost = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          summary: data.subtitle || data.excerpt,
          content_json: data.content_json || { type: 'doc', content: [] },
          content_html: data.content_html || data.content || '',
          toc_data: data.toc_data || [],
          author_id: data.author_id,
          author: data.profiles
            ? {
                id: data.profiles.id,
                username: data.profiles.username,
                avatar_url: data.profiles.avatar_url,
                bio: data.profiles.bio,
              }
            : undefined,
          cover_image: data.image_url,
          cover_image_alt: data.cover_image_alt,
          status: data.status || 'published',
          tags: Array.isArray(data.tags) ? data.tags : [],
          category: data.category,
          reading_time_minutes: data.reading_time_minutes || 5,
          word_count: data.word_count || 0,
          meta_title: data.meta_title,
          meta_description: data.meta_description,
          og_image: data.og_image,
          published_at: data.published_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        setPost(blogPost);
      } catch (error) {
        console.error('Error loading blog post:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#27C93F]" size={48} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-[#E6EDF3]/60">Blog post not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BlogHero post={post} />

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Left: Floating TOC */}
          <FloatingTOC items={post.toc_data} />

          {/* Center: Content */}
          <div>
            <BlogContent html={post.content_html} />
            <EngagementBar postId={post.id} />
          </div>
        </div>

        {/* Comments Panel */}
        <CommentsPanel postId={post.id} />
      </div>
    </div>
  );
}
