import { lazy, Suspense } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, User, Terminal } from 'lucide-react';
import { Post } from '../../lib/supabase';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { CommentSection } from '../comments/CommentSection';
import { ReactionBar } from '../reactions/ReactionBar';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeURL } from '../../utils/security';

// Lazy load the entire markdown renderer bundle
const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

type PostDetailProps = {
  post: Post;
  userVote?: 1 | -1 | null;
  onVote: (postId: string, voteType: 1 | -1) => void;
  onBack: () => void;
};

export function PostDetail({ post, userVote, onVote, onBack }: PostDetailProps) {
  const { user } = useAuth();

  const handleVote = (voteType: 1 | -1) => {
    if (user) {
      onVote(post.id, voteType);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-400 hover:text-terminal-green mb-6 transition-colors font-mono"
      >
        <ArrowLeft size={20} />
        <span>$ back</span>
      </button>

      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-800 px-3 py-2 flex items-center space-x-1.5 border-b border-gray-700">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <div className="flex-1 flex items-center justify-center">
            <Terminal size={12} className="text-gray-500 mr-1" />
            <span className="text-xs text-gray-500 font-mono">post_detail.md</span>
          </div>
        </div>
        <div className="p-8">
          <div className="flex items-start space-x-4 mb-6">
            <div className="flex flex-col items-center space-y-2 bg-gray-850 rounded-lg p-3 border border-gray-700">
              <button
                onClick={() => handleVote(1)}
                className={`p-2 rounded hover:bg-gray-800 transition-colors ${
                  userVote === 1 ? 'text-terminal-green' : 'text-gray-500'
                }`}
              >
                <ArrowUp size={24} />
              </button>
              <span
                className={`font-bold text-lg font-mono ${
                  userVote === 1 ? 'text-terminal-green' : userVote === -1 ? 'text-terminal-pink' : 'text-gray-400'
                }`}
              >
                {post.vote_count}
              </span>
              <button
                onClick={() => handleVote(-1)}
                className={`p-2 rounded hover:bg-gray-800 transition-colors ${
                  userVote === -1 ? 'text-terminal-pink' : 'text-gray-500'
                }`}
              >
                <ArrowDown size={24} />
              </button>
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                {post.profiles?.avatar_url ? (
                  <img
                    src={sanitizeURL(post.profiles.avatar_url)}
                    alt={post.profiles.username}
                    className="w-10 h-10 rounded-full object-cover border border-terminal-purple"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-800 border border-terminal-purple rounded-full flex items-center justify-center">
                    <User size={20} className="text-terminal-purple" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-terminal-blue font-mono">
                    {post.profiles?.username || 'anonymous'}
                  </p>
                  <p className="text-sm text-gray-500 font-mono">
                    {formatDistanceToNow(post.created_at)}
                  </p>
                </div>
                {post.category && (
                  <span className="ml-auto bg-terminal-purple/20 text-terminal-purple text-xs font-semibold px-3 py-1 rounded-full border border-terminal-purple/30 font-mono">
                    {post.category}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-100 mb-4 font-mono">
                $ {post.title}
              </h1>

              {post.image_url && (
                <img
                  src={sanitizeURL(post.image_url)}
                  alt={post.title}
                  className="w-full rounded border border-gray-700 mb-6"
                />
              )}

              <div className="prose prose-invert max-w-none mb-6 text-gray-300 text-base leading-relaxed font-mono">
                <Suspense fallback={
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-full"></div>
                    <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-800 rounded w-4/6"></div>
                  </div>
                }>
                  <MarkdownRenderer content={post.content} />
                </Suspense>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <ReactionBar postId={post.id} />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 p-8 bg-gray-850">
          <CommentSection postId={post.id} />
        </div>
      </div>
    </div>
  );
}
