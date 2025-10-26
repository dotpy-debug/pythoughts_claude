/**
 * Blog Editor Page
 *
 * Full blog post editor with three-column canvas layout
 * Integrates BlogEditorCanvas with save/publish functionality
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { BlogEditorCanvas } from '../components/blog/editor/BlogEditorCanvas';
import { BlogPost } from '../types/blog';
import {
  saveBlogPost,
  publishBlogPost,
  getBlogPostById,
} from '../services/blog';
import { useAuth } from '../contexts/AuthContext';

export function BlogEditorPage() {
  const { postId } = useParams<{ postId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [initialPost, setInitialPost] = useState<Partial<BlogPost> | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      navigate('/');
      return;
    }

    const loadPost = async () => {
      if (!postId) {
        // New post
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await getBlogPostById(postId);

        if (error || !data) {
          console.error('Error loading blog post:', error);
          navigate('/404');
          return;
        }

        // Security check: only author can edit
        if (data.author_id !== user.id) {
          console.error('Unauthorized: not post author');
          navigate('/');
          return;
        }

        setInitialPost(data);
      } catch (error) {
        console.error('Exception loading blog post:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId, user, navigate]);

  const handleSave = async (post: Partial<BlogPost>) => {
    if (!user) return;

    try {
      const { data, error } = await saveBlogPost(post, user.id);

      if (error) {
        console.error('Error saving blog post:', error);
        // TODO: Show error toast
        return;
      }

      // Update initialPost with saved data to get ID for subsequent saves
      if (data && !initialPost?.id) {
        setInitialPost(data);
        // Update URL to include post ID
        navigate(`/blog/edit/${data.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Exception saving blog post:', error);
      // TODO: Show error toast
    }
  };

  const handlePublish = async (post: Partial<BlogPost>) => {
    if (!user) return;

    try {
      const { data, error } = await publishBlogPost(post, user.id);

      if (error) {
        console.error('Error publishing blog post:', error);
        // TODO: Show error toast
        return;
      }

      if (data) {
        // TODO: Show success toast
        console.log('Blog post published successfully!');

        // Navigate to published post
        navigate(`/blog/${data.slug}`);
      }
    } catch (error) {
      console.error('Exception publishing blog post:', error);
      // TODO: Show error toast
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#27C93F]" size={48} />
      </div>
    );
  }

  return (
    <BlogEditorCanvas
      initialPost={initialPost}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
}
