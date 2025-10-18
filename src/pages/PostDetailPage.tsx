import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';

const PostDetail = lazy(() => import('../components/posts/PostDetail').then(mod => ({ default: mod.PostDetail })));

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);

  const loadPost = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error) {
      console.error('Error loading post:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  }, [postId, navigate]);

  const loadUserVote = useCallback(async () => {
    if (!user || !postId) return;

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserVote(data?.vote_type || null);
    } catch (error) {
      console.error('Error loading user vote:', error);
    }
  }, [user, postId]);

  useEffect(() => {
    loadPost();
    loadUserVote();
  }, [loadPost, loadUserVote]);

  const handleVote = async (postIdParam: string, voteType: 1 | -1) => {
    if (!user || !post) return;

    try {
      if (userVote === voteType) {
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postIdParam);

        setUserVote(null);
        setPost({
          ...post,
          vote_count: post.vote_count - voteType,
        });
      } else if (userVote) {
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('user_id', user.id)
          .eq('post_id', postIdParam);

        setUserVote(voteType);
        setPost({
          ...post,
          vote_count: post.vote_count - userVote + voteType,
        });
      } else {
        await supabase.from('votes').insert({
          user_id: user.id,
          post_id: postIdParam,
          vote_type: voteType,
        });

        setUserVote(voteType);
        setPost({
          ...post,
          vote_count: post.vote_count + voteType,
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Post not found</p>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    }>
      <PostDetail
        post={post}
        userVote={userVote}
        onVote={handleVote}
        onBack={handleBack}
      />
    </Suspense>
  );
}
