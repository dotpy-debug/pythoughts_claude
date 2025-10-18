import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to track post views
 * Automatically records a view when the component mounts
 */
export function usePostView(postId: string | undefined) {
  const { user } = useAuth();

  useEffect(() => {
    if (!postId) return;

    const trackView = async () => {
      try {
        // Check if user has already viewed this post recently (within last hour)
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        if (user) {
          const { data: existingView } = await supabase
            .from('post_views')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .gte('created_at', oneHourAgo.toISOString())
            .single();

          // Skip if view already recorded recently
          if (existingView) return;
        }

        // Record the view
        await supabase.from('post_views').insert({
          post_id: postId,
          user_id: user?.id || null,
          ip_address: null, // Could be populated server-side
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        // Silently fail - view tracking should not break the app
        console.debug('Error tracking post view:', error);
      }
    };

    trackView();
  }, [postId, user]);
}
