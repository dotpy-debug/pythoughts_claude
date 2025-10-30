import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { BlogsListView } from './BlogsListView';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Enable ISR with 5-minute revalidation for blog listing
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Blogs',
  description: 'Explore all blog posts on Pythoughts - technical articles, tutorials, and thought pieces.',
  keywords: ['blog', 'articles', 'tutorials', 'programming', 'web development'],
  openGraph: {
    title: 'Blogs | Pythoughts',
    description: 'Explore all blog posts on Pythoughts',
    type: 'website',
  },
};

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

/**
 * Fetch all published blog posts
 */
async function getBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      slug,
      title,
      subtitle,
      cover_image:image_url,
      published_at,
      reading_time,
      view_count,
      tags,
      author:profiles!author_id (
        username,
        avatar_url
      )
    `)
    .eq('post_type', 'blog')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }

  return (data || []) as unknown as BlogPost[];
}

/**
 * Blogs Listing Page (Server Component with ISR)
 */
export default async function BlogsPage() {
  const posts = await getBlogPosts();

  return <BlogsListView posts={posts} />;
}
