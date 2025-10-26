import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';
import { usePostView } from '../hooks/usePostView';
import { generateBlogPostSchema, StructuredData } from '../utils/seo';
import { SEOHead } from '../components/seo/SEOHead';

const PostDetail = lazy(() => import('../components/posts/PostDetail').then(mod => ({ default: mod.PostDetail })));

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Track post view
  usePostView(postId);

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

  // SEO meta tags are now handled by SEOHead component in the JSX return

  const loadRelatedPosts = useCallback(async () => {
    if (!post) return;

    try {
      setLoadingRelated(true);

      // Get related posts by same author
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .neq('id', post.id)
        .eq('author_id', post.author_id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRelatedPosts(data || []);
    } catch (error) {
      console.error('Error loading related posts:', error);
    } finally {
      setLoadingRelated(false);
    }
  }, [post]);

  useEffect(() => {
    if (post) {
      loadRelatedPosts();
    }
  }, [post, loadRelatedPosts]);

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
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title={post.seo_title || `${post.title} - Pythoughts`}
        description={post.seo_description || post.content.substring(0, 160).replace(/[#*`]/g, '')}
        canonicalUrl={post.canonical_url || `https://pythoughts.com/post/${post.id}`}
        type="article"
        image={post.image_url || undefined}
        author={post.author_id}
        publishedTime={post.created_at}
        modifiedTime={post.updated_at}
        section={post.category}
        keywords={`${post.category}, ${post.tags?.join(', ') || 'blog, tech, programming'}`}
      />

      {/* Structured Data for SEO */}
      <StructuredData data={generateBlogPostSchema(post)} />

      <div className="space-y-8">
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

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-100 font-mono">
            <span className="text-terminal-green">$</span> related_posts
          </h2>

          {loadingRelated ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-terminal-green" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPosts.map((relatedPost) => (
                <div
                  key={relatedPost.id}
                  onClick={() => navigate(`/post/${relatedPost.id}`)}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-terminal-green cursor-pointer transition-all duration-220 group"
                >
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-terminal-green/20 border border-terminal-green rounded-lg flex items-center justify-center">
                      <FileText size={18} className="text-terminal-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-100 group-hover:text-terminal-green transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-3 mb-3">
                    {relatedPost.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                    <span>{new Date(relatedPost.created_at).toLocaleDateString()}</span>
                    <ArrowRight size={14} className="text-gray-600 group-hover:text-terminal-green transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
