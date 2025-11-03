import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Post } from '../lib/supabase';

const PostList = lazy(() => import('../components/posts/PostList').then(module_ => ({ default: module_.PostList })));

export function HomePage() {
  const navigate = useNavigate();

  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    }>
      <PostList postType="news" onPostClick={handlePostClick} />
    </Suspense>
  );
}
