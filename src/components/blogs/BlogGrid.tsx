import { useState, useEffect, useCallback } from 'react';
import { supabase, Post } from '../../lib/supabase';
import { BlogCard } from './BlogCard';
import { Loader2, ChevronDown } from 'lucide-react';

type BlogGridProperties = {
  onBlogClick: (post: Post) => void;
};

const categories = ['All', 'Tech', 'Product', 'Design', 'Engineering', 'Culture'];

// Pagination configuration (smaller for grid layout)
const BLOGS_PER_PAGE = 30;

export function BlogGrid({ onBlogClick }: BlogGridProperties) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadBlogs = useCallback(async (pageNumber: number = 0, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Calculate range for pagination
      const from = pageNumber * BLOGS_PER_PAGE;
      const to = from + BLOGS_PER_PAGE - 1;

      // Build optimized query with explicit fields
      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          subtitle,
          content,
          author_id,
          post_type,
          category,
          image_url,
          vote_count,
          comment_count,
          is_published,
          is_draft,
          featured,
          created_at,
          updated_at,
          published_at,
          reading_time_minutes,
          seo_title,
          seo_description,
          canonical_url,
          profiles:author_id (
            id,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('post_type', 'blog')
        .eq('is_published', true)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      // Transform profiles from array to single object (Supabase returns as array)
      const blogsData: Post[] = (data || []).map((item) => ({
        ...(item as unknown as Post),
        profiles: Array.isArray((item as { profiles?: unknown }).profiles)
          ? (item as { profiles: unknown[] }).profiles[0]
          : (item as { profiles?: unknown }).profiles,
      })) as Post[];

      // Check if we have more pages
      setHasMore(blogsData.length === BLOGS_PER_PAGE);

      // Update posts (append or replace)
      if (append) {
        setPosts(previous => [...previous, ...blogsData]);
      } else {
        setPosts(blogsData);
      }

    } catch (error) {
      console.error('Error loading blogs:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory]);

  // Reset to page 0 when category changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadBlogs(0, false);
  }, [selectedCategory, loadBlogs]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadBlogs(nextPage, true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const [featuredPost, ...restPosts] = posts;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No blog posts yet. Be the first to write one!</p>
        </div>
      ) : (
        <>
          {featuredPost && (
            <BlogCard
              post={featuredPost}
              onClick={() => onBlogClick(featuredPost)}
              featured
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restPosts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                onClick={() => onBlogClick(post)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center py-8 mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={20} />
                    <span>Load More Blogs</span>
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8 mt-8">
              <p className="text-gray-500">You've reached the end!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
