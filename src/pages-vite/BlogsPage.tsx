import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Post } from '../lib/supabase';

const BlogGrid = lazy(() => import('../components/blogs/BlogGrid').then(module_ => ({ default: module_.BlogGrid })));

export function BlogsPage() {
  const navigate = useNavigate();

  const handleBlogClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    }>
      <BlogGrid onBlogClick={handleBlogClick} />
    </Suspense>
  );
}
