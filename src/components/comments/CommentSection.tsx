import { useState, useEffect, useCallback } from 'react';
import { supabase, Comment } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { Loader2 } from 'lucide-react';
import { sanitizeInput, isValidContentLength } from '../../utils/security';

type CommentSectionProps = {
  postId: string;
};

export function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(async () => {
    try {
      // Load comments with explicit fields
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          author_id,
          post_id,
          parent_comment_id,
          depth,
          vote_count,
          created_at,
          updated_at,
          profiles:author_id (
            id,
            username,
            avatar_url,
            bio
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform profiles from array to single object
      const commentsData: Comment[] = (data || []).map((item) => ({
        ...(item as unknown as Comment),
        profiles: Array.isArray((item as { profiles?: unknown }).profiles)
          ? (item as { profiles: unknown[] }).profiles[0]
          : (item as { profiles?: unknown }).profiles,
      })) as Comment[];

      // Load user votes for visible comments (not N+1)
      if (user && commentsData.length > 0) {
        const commentIds = commentsData.map(c => c.id);
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('comment_id, vote_type')
          .eq('user_id', user.id)
          .in('comment_id', commentIds)
          .not('comment_id', 'is', null);

        if (!votesError && votesData) {
          const votesMap: Record<string, 1 | -1> = {};
          votesData.forEach((vote) => {
            if (vote.comment_id) {
              votesMap[vote.comment_id] = vote.vote_type;
            }
          });
          setUserVotes(votesMap);
        }
      }

      const buildCommentTree = (flatComments: Comment[]): Comment[] => {
        const commentMap: Record<string, Comment> = {};
        const rootComments: Comment[] = [];

        flatComments.forEach((comment) => {
          commentMap[comment.id] = { ...comment, replies: [] };
        });

        flatComments.forEach((comment) => {
          if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
            commentMap[comment.parent_comment_id].replies!.push(commentMap[comment.id]);
          } else {
            rootComments.push(commentMap[comment.id]);
          }
        });

        return rootComments;
      };

      const commentsTree = buildCommentTree(commentsData);
      setComments(commentsTree);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    loadComments();

    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => {
        loadComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user, loadComments]);

  const handleVote = async (commentId: string, voteType: 1 | -1) => {
    if (!user) return;

    try {
      const existingVote = userVotes[commentId];

      if (existingVote === voteType) {
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('comment_id', commentId);

        const newVotes = { ...userVotes };
        delete newVotes[commentId];
        setUserVotes(newVotes);
      } else if (existingVote) {
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('user_id', user.id)
          .eq('comment_id', commentId);

        setUserVotes({ ...userVotes, [commentId]: voteType });
      } else {
        await supabase.from('votes').insert({
          user_id: user.id,
          comment_id: commentId,
          vote_type: voteType,
        });

        setUserVotes({ ...userVotes, [commentId]: voteType });
      }

      await loadComments();
    } catch (error) {
      console.error('Error voting on comment:', error);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!user) return;

    // Validate content length (min 1, max 1000 chars)
    if (!isValidContentLength(content, 1, 1000)) {
      throw new Error('Comment must be between 1 and 1,000 characters');
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = sanitizeInput(content.trim());

    try {
      await supabase.from('comments').insert({
        content: sanitizedContent,
        author_id: user.id,
        post_id: postId,
        parent_comment_id: null,
        depth: 0,
      });

      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!user) return;

    // Validate content length (min 1, max 1000 chars)
    if (!isValidContentLength(content, 1, 1000)) {
      throw new Error('Reply must be between 1 and 1,000 characters');
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = sanitizeInput(content.trim());

    try {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('depth')
        .eq('id', parentId)
        .single();

      await supabase.from('comments').insert({
        content: sanitizedContent,
        author_id: user.id,
        post_id: postId,
        parent_comment_id: parentId,
        depth: (parentComment?.depth || 0) + 1,
      });

      await loadComments();
    } catch (error) {
      console.error('Error replying to comment:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="animate-spin text-terminal-green" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-4 font-mono">
          $ comments ({comments.length})
        </h3>
        {user ? (
          <CommentForm onSubmit={handleAddComment} />
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 text-center">
            <p className="text-gray-400 font-mono">$ sign in to join the discussion</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            userVote={userVotes[comment.id] || null}
            onVote={handleVote}
            onReply={handleReply}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}
