import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { BlogPost } from '../../../types/blog';
import { BlogPostView } from './BlogPostView';
import { JSONContent } from '@tiptap/react';

// Initialize Supabase client for Server Components
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Enable ISR with 1-hour revalidation
export const revalidate = 3600;

// Enable dynamic rendering fallback
export const dynamicParams = true;

/**
 * Generate static params for top 100 blog posts (SSG)
 * These pages will be pre-rendered at build time
 */
export async function generateStaticParams() {
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('slug')
      .eq('post_type', 'blog')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(100);

    return (posts || []).map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

/**
 * Fetch blog post data
 */
async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      slug,
      title,
      subtitle,
      summary,
      content_html,
      content_json,
      toc_data,
      created_at,
      updated_at,
      published_at,
      reading_time,
      reading_time_minutes,
      word_count,
      view_count,
      author_id,
      cover_image:image_url,
      cover_image_alt,
      tags,
      status,
      author:profiles!author_id (
        id,
        username,
        avatar_url
      )
    `)
    .eq('slug', slug)
    .eq('post_type', 'blog')
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return null;
  }

  // Transform database response to BlogPost type
  return {
    ...data,
    content_json: data.content_json as JSONContent,
    toc_data: data.toc_data || [],
  } as unknown as BlogPost;
}

/**
 * Generate metadata for SEO (Next.js 15)
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getBlogPost(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const publishedTime = post.published_at ? new Date(post.published_at).toISOString() : undefined;
  const modifiedTime = new Date(post.updated_at).toISOString();

  return {
    title: post.title,
    description: post.subtitle || post.title,
    keywords: post.tags,
    authors: post.author ? [{ name: post.author.username }] : [],
    openGraph: {
      title: post.title,
      description: post.subtitle || post.title,
      type: 'article',
      publishedTime,
      modifiedTime,
      authors: post.author ? [post.author.username] : [],
      tags: post.tags,
      images: post.cover_image
        ? [
            {
              url: post.cover_image,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.subtitle || post.title,
      images: post.cover_image ? [post.cover_image] : [],
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  };
}

/**
 * Blog Post Page (Server Component with SSG/ISR) - Next.js 15
 */
export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

  // Increment view count asynchronously (fire and forget)
  void supabase
    .from('posts')
    .update({ view_count: (post.view_count ?? 0) + 1 })
    .eq('id', post.id)
    .then(null, (error: Error) => console.error('Failed to increment view count:', error));

  return <BlogPostView post={post} />;
}
