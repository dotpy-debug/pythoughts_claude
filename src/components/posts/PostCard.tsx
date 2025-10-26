import { useState, memo } from 'react';
import { ArrowUp, ArrowDown, MessageCircle, User, Terminal, Flag, TrendingUp } from 'lucide-react';
import { Post } from '../../lib/supabase';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { sanitizeURL } from '../../utils/security';
import { ShareButton } from './ShareButton';
import { BookmarkButton } from '../bookmarks/BookmarkButton';
import { ReportModal } from '../moderation/ReportModal';
import { FeaturedToggle } from './FeaturedToggle';
import { getVoteAriaLabel, getCommentAriaLabel, getTimeAgoAriaLabel } from '../../utils/accessibility';
import { ReputationBadge } from '../reputation/ReputationBadge';
import { BadgeGallery } from '../badges/BadgeGallery';
import { LazyImage } from '../performance/LazyImage';

type PostCardProps = {
  post: Post;
  userVote?: 1 | -1 | null;
  onVote: (postId: string, voteType: 1 | -1) => void;
  onClick: () => void;
};

export const PostCard = memo(function PostCard({ post, userVote, onVote, onClick }: PostCardProps) {
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const handleVote = (e: React.MouseEvent, voteType: 1 | -1) => {
    e.stopPropagation();
    onVote(post.id, voteType);
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReportModalOpen(true);
  };

  // Format engagement score for display
  const getEngagementLevel = (score: number): { level: string; color: string } => {
    if (score >= 100) return { level: 'Hot', color: 'text-orange-400' };
    if (score >= 50) return { level: 'Trending', color: 'text-terminal-green' };
    if (score >= 20) return { level: 'Active', color: 'text-terminal-blue' };
    return { level: 'New', color: 'text-gray-500' };
  };

  const engagementScore = post.post_stats?.engagement_score || 0;
  const engagementLevel = getEngagementLevel(engagementScore);

  return (
    <article
      onClick={onClick}
      role="article"
      aria-label={`Post by ${post.profiles?.username || 'anonymous'}: ${post.title}`}
      className="bg-gray-900 border border-gray-700 rounded-lg hover:border-terminal-green transition-all cursor-pointer overflow-hidden shadow-lg hover:shadow-glow-purple"
    >
      <div className="bg-gray-800 px-3 py-2 flex items-center space-x-1.5 border-b border-gray-700">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <div className="flex-1 flex items-center justify-center">
          <Terminal size={12} className="text-gray-500 mr-1" />
          <span className="text-xs text-gray-500 font-mono">post.py</span>
        </div>
      </div>

      <div className="flex">
        <div className="flex flex-col items-center p-4 space-y-1 bg-gray-850 border-r border-gray-700" role="group" aria-label="Vote controls">
          <button
            onClick={(e) => handleVote(e, 1)}
            aria-label={userVote === 1 ? 'Remove upvote' : 'Upvote post'}
            aria-pressed={userVote === 1}
            className={`p-1 rounded transition-colors ${
              userVote === 1 ? 'text-terminal-green' : 'text-gray-500 hover:text-terminal-green'
            }`}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
          <span
            className={`font-bold text-sm font-mono ${
              userVote === 1 ? 'text-terminal-green' : userVote === -1 ? 'text-terminal-pink' : 'text-gray-400'
            }`}
            aria-label={getVoteAriaLabel(post.vote_count, userVote)}
          >
            {post.vote_count}
          </span>
          <button
            onClick={(e) => handleVote(e, -1)}
            aria-label={userVote === -1 ? 'Remove downvote' : 'Downvote post'}
            aria-pressed={userVote === -1}
            className={`p-1 rounded transition-colors ${
              userVote === -1 ? 'text-terminal-pink' : 'text-gray-500 hover:text-terminal-pink'
            }`}
          >
            <ArrowDown size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-center space-x-2 mb-2 flex-wrap">
            {post.profiles?.avatar_url ? (
              <img
                src={sanitizeURL(post.profiles.avatar_url)}
                alt={post.profiles.username}
                loading="lazy"
                className="w-6 h-6 rounded-full object-cover border border-terminal-purple"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-800 border border-terminal-purple rounded-full flex items-center justify-center">
                <User size={12} className="text-terminal-purple" />
              </div>
            )}
            <span className="text-sm font-mono text-terminal-blue">
              {post.profiles?.username || 'anonymous'}
            </span>
            <ReputationBadge userId={post.author_id} variant="inline" />
            <BadgeGallery userId={post.author_id} variant="compact" />
            <span className="text-gray-600">•</span>
            <time className="text-xs text-gray-500 font-mono" dateTime={post.created_at} aria-label={getTimeAgoAriaLabel(post.created_at)}>
              {formatDistanceToNow(post.created_at)}
            </time>
            {post.category && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-xs bg-terminal-purple/20 text-terminal-purple px-2 py-0.5 rounded font-mono border border-terminal-purple/30">
                  {post.category}
                </span>
              </>
            )}
            <FeaturedToggle
              postId={post.id}
              postAuthorId={post.author_id}
              initialFeatured={post.featured || false}
              size="sm"
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-100 mb-2 hover:text-terminal-green transition-colors">
            $ {post.title}
          </h3>

          {post.image_url && (
            <LazyImage
              src={sanitizeURL(post.image_url)}
              alt={post.title}
              className="w-full h-48 object-cover rounded border border-gray-700"
              placeholderClassName="w-full h-48 rounded border border-gray-700 mb-3"
            />
          )}

          <p className="text-gray-400 line-clamp-2 mb-3 font-mono text-sm">
            {post.content}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-500 font-mono">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 hover:text-terminal-blue transition-colors" aria-label={getCommentAriaLabel(post.comment_count)}>
                <MessageCircle size={14} aria-hidden="true" />
                <span>{post.comment_count}</span>
              </div>
              {engagementScore > 0 && (
                <div
                  className={`flex items-center space-x-1 ${engagementLevel.color} transition-colors`}
                  title={`Engagement score: ${engagementScore.toFixed(1)}`}
                  aria-label={`${engagementLevel.level} engagement`}
                >
                  <TrendingUp size={14} aria-hidden="true" />
                  <span className="text-xs font-semibold">{engagementLevel.level}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              <BookmarkButton postId={post.id} variant="compact" />
              <ShareButton post={post} variant="compact" />
              <button
                onClick={handleReport}
                className="flex items-center space-x-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Report post"
              >
                <Flag size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        contentType="post"
        contentId={post.id}
        reportedUserId={post.author_id}
      />
    </article>
  );
});
