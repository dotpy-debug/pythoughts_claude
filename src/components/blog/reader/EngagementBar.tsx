/**
 * Engagement Bar Component
 *
 * Displays engagement actions for blog posts:
 * - Like/vote counter and button
 * - Comment counter and button
 * - Share button
 * - Bookmark button
 */

import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface EngagementBarProps {
  postId: string;
  initialLikes?: number;
  initialComments?: number;
  initialIsLiked?: boolean;
  initialIsBookmarked?: boolean;
  onCommentClick?: () => void;
  className?: string;
}

export function EngagementBar({
  postId: _postId,
  initialLikes = 0,
  initialComments = 0,
  initialIsLiked = false,
  initialIsBookmarked = false,
  onCommentClick,
  className,
}: EngagementBarProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);

  const handleLike = async () => {
    // Optimistic update
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);

    // TODO: Make API call to update like status
    try {
      // await toggleLike(postId);
    } catch (error) {
      // Revert on error
      setIsLiked(!isLiked);
      setLikes(isLiked ? likes + 1 : likes - 1);
      console.error('Failed to toggle like:', error);
    }
  };

  const handleBookmark = async () => {
    // Optimistic update
    setIsBookmarked(!isBookmarked);

    // TODO: Make API call to update bookmark status
    try {
      // await toggleBookmark(postId);
    } catch (error) {
      // Revert on error
      setIsBookmarked(!isBookmarked);
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        // TODO: Show toast notification
        console.log('Link copied to clipboard');
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-6 py-6 mt-8 border-t border-white/10',
        className
      )}
    >
      {/* Like Button */}
      <button
        onClick={handleLike}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
          'hover:bg-white/5',
          isLiked && 'text-[#27C93F] bg-[#27C93F]/10',
          !isLiked && 'text-[#E6EDF3]/70'
        )}
        aria-label={isLiked ? 'Unlike post' : 'Like post'}
      >
        <Heart
          size={20}
          className={cn(
            'transition-transform',
            isLiked && 'fill-current scale-110'
          )}
        />
        <span className="text-sm font-medium">{likes}</span>
      </button>

      {/* Comment Button */}
      <button
        onClick={onCommentClick}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-white/5 text-[#E6EDF3]/70 hover:text-[#27C93F]"
        aria-label="View comments"
      >
        <MessageCircle size={20} />
        <span className="text-sm font-medium">{initialComments}</span>
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-white/5 text-[#E6EDF3]/70 hover:text-[#27C93F]"
        aria-label="Share post"
      >
        <Share2 size={20} />
        <span className="text-sm font-medium hidden sm:inline">Share</span>
      </button>

      {/* Bookmark Button */}
      <button
        onClick={handleBookmark}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
          'hover:bg-white/5',
          isBookmarked && 'text-[#27C93F] bg-[#27C93F]/10',
          !isBookmarked && 'text-[#E6EDF3]/70'
        )}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
      >
        <Bookmark
          size={20}
          className={cn(
            'transition-transform',
            isBookmarked && 'fill-current scale-110'
          )}
        />
        <span className="text-sm font-medium hidden sm:inline">
          {isBookmarked ? 'Saved' : 'Save'}
        </span>
      </button>
    </div>
  );
}
