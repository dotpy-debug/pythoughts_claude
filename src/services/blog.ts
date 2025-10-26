/**
 * Blog Service
 *
 * API layer for blog post operations:
 * - Save/update blog posts
 * - Publish posts
 * - Generate HTML from tiptap JSON
 * - Generate slugs
 */

import { supabase } from '../lib/supabase';
import { BlogPost } from '../types/blog';
import { tiptapToHTML } from '../utils/blog/tiptap-renderer';
import { TOCGenerator } from '../utils/blog/toc-generator';
import slugify from 'slugify';
import { logger } from '../lib/logger';

/**
 * Save blog post draft
 */
export async function saveBlogPost(
  post: Partial<BlogPost>,
  userId: string
): Promise<{ data: BlogPost | null; error: Error | null }> {
  try {
    // Generate slug if title exists and no slug
    let slug = post.slug;
    if (!slug && post.title) {
      slug = await generateUniqueSlug(post.title);
    }

    // Generate HTML from tiptap JSON if content exists
    let contentHtml = post.content_html;
    if (post.content_json && !contentHtml) {
      contentHtml = tiptapToHTML(post.content_json);
    }

    // Generate TOC if not provided
    let tocData = post.toc_data;
    if (post.content_json && !tocData) {
      const generator = new TOCGenerator();
      tocData = generator.extractFromJSON(post.content_json);
    }

    const postData = {
      title: post.title || 'Untitled',
      slug,
      subtitle: post.summary,
      content: contentHtml, // For backward compatibility
      content_html: contentHtml,
      content_json: post.content_json,
      toc_data: tocData,
      image_url: post.cover_image,
      cover_image_alt: post.cover_image_alt,
      category: post.category,
      tags: post.tags,
      reading_time_minutes: post.reading_time_minutes || 0,
      word_count: post.word_count || 0,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      og_image: post.og_image,
      status: post.status || 'draft',
      post_type: 'blog',
      author_id: userId,
      is_published: post.status === 'published',
    };

    let result;
    if (post.id) {
      // Update existing post
      result = await supabase
        .from('posts')
        .update(postData)
        .eq('id', post.id)
        .eq('author_id', userId) // Security: only author can update
        .select()
        .single();
    } else {
      // Create new post
      result = await supabase.from('posts').insert(postData).select().single();
    }

    if (result.error) {
      logger.error('Error saving blog post', { errorDetails: result.error });
      return { data: null, error: result.error };
    }

    return { data: result.data as BlogPost, error: null };
  } catch (error) {
    logger.error('Exception saving blog post', { errorDetails: error });
    return { data: null, error: error as Error };
  }
}

/**
 * Publish blog post
 */
export async function publishBlogPost(
  post: Partial<BlogPost>,
  userId: string
): Promise<{ data: BlogPost | null; error: Error | null }> {
  try {
    // First save the post
    const { data: savedPost, error: saveError } = await saveBlogPost(
      { ...post, status: 'published' },
      userId
    );

    if (saveError || !savedPost) {
      return { data: null, error: saveError };
    }

    // Update published_at timestamp
    const { data, error } = await supabase
      .from('posts')
      .update({
        published_at: new Date().toISOString(),
        is_published: true,
      })
      .eq('id', savedPost.id)
      .select()
      .single();

    if (error) {
      logger.error('Error publishing blog post', { errorDetails: error });
      return { data: null, error };
    }

    return { data: data as BlogPost, error: null };
  } catch (error) {
    logger.error('Exception publishing blog post', { errorDetails: error });
    return { data: null, error: error as Error };
  }
}

/**
 * Generate unique slug from title
 */
async function generateUniqueSlug(title: string): Promise<string> {
  let baseSlug = slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });

  if (!baseSlug) {
    baseSlug = 'untitled';
  }

  // Check if slug exists
  const { error } = await supabase
    .from('posts')
    .select('slug')
    .eq('slug', baseSlug)
    .single();

  // If no conflict, use base slug
  if (error && error.code === 'PGRST116') {
    return baseSlug;
  }

  // If conflict, append counter
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (true) {
    const { error } = await supabase
      .from('posts')
      .select('slug')
      .eq('slug', uniqueSlug)
      .single();

    if (error && error.code === 'PGRST116') {
      return uniqueSlug;
    }

    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
}

/**
 * Get blog post by slug
 */
export async function getBlogPostBySlug(
  slug: string
): Promise<{ data: BlogPost | null; error: Error | null }> {
  try {
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
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as unknown as BlogPost, error: null };
  } catch (error) {
    logger.error('Exception getting blog post', { errorDetails: error });
    return { data: null, error: error as Error };
  }
}

/**
 * Get blog post by ID (for editing)
 */
export async function getBlogPostById(
  id: string
): Promise<{ data: BlogPost | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('post_type', 'blog')
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as unknown as BlogPost, error: null };
  } catch (error) {
    logger.error('Exception getting blog post by ID', { errorDetails: error });
    return { data: null, error: error as Error };
  }
}
