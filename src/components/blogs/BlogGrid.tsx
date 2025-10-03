import { useState, useEffect, useCallback } from 'react';
import { supabase, Post } from '../../lib/supabase';
import { BlogCard } from './BlogCard';
import { Loader2 } from 'lucide-react';

type BlogGridProps = {
  onBlogClick: (post: Post) => void;
};

const categories = ['All', 'Tech', 'Product', 'Design', 'Engineering', 'Culture'];

export function BlogGrid({ onBlogClick }: BlogGridProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('post_type', 'blog')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading blogs:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

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
        </>
      )}
    </div>
  );
}
