import { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toggleFeaturedPost } from '../../actions/posts';
import { logger } from '../../lib/logger';

interface FeaturedToggleProperties {
  postId: string;
  postAuthorId: string;
  initialFeatured: boolean;
  onToggle?: (featured: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function FeaturedToggle({
  postId,
  postAuthorId,
  initialFeatured,
  onToggle,
  size = 'md',
  showLabel = false,
}: FeaturedToggleProperties) {
  const { user, profile } = useAuth();
  const [featured, setFeatured] = useState(initialFeatured);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState('');

  // Check if user can toggle featured status
  const canToggle = user && (profile?.is_admin || user.id === postAuthorId);

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !canToggle) return;

    setIsToggling(true);
    setError('');

    try {
      const result = await toggleFeaturedPost(postId, user.id);

      if (result.success && result.featured !== undefined) {
        setFeatured(result.featured);
        onToggle?.(result.featured);
        logger.info('Featured status toggled successfully', { postId, featured: result.featured });
      } else {
        setError(result.error || 'Failed to toggle featured status');
        logger.error('Failed to toggle featured status', { postId, errorMessage: result.error });
      }
    } catch (error_) {
      const errorMessage = error_ instanceof Error ? error_.message : 'An unexpected error occurred';
      setError(errorMessage);
      if (error_ instanceof Error) {
        logger.error('Unexpected error toggling featured status', error_, { postId });
      } else {
        logger.error('Unexpected error toggling featured status', { postId, errorMessage: String(error_) });
      }
    } finally {
      setIsToggling(false);
    }
  };

  if (!canToggle && !featured) {
    // Don't show anything if user can't toggle and post isn't featured
    return null;
  }

  return (
    <div className="flex items-center space-x-1.5">
      <button
        onClick={canToggle ? handleToggle : undefined}
        disabled={isToggling || !canToggle}
        className={`
          flex items-center space-x-1 transition-all duration-200
          ${featured ? 'text-orange-400' : 'text-gray-500'}
          ${
            canToggle
              ? 'cursor-pointer hover:scale-110 hover:text-orange-300'
              : 'cursor-default'
          }
          ${isToggling ? 'opacity-50 cursor-wait' : ''}
        `}
        title={
          canToggle
            ? (featured
              ? 'Unfeature this post'
              : 'Feature this post')
            : 'Featured Post'
        }
        aria-label={
          canToggle
            ? (featured
              ? 'Unfeature this post'
              : 'Feature this post')
            : 'Featured Post'
        }
      >
        <Star
          size={iconSizes[size]}
          className={`
            transition-all duration-200
            ${featured ? 'fill-orange-400' : 'fill-none'}
          `}
        />
        {showLabel && featured && (
          <span className="text-xs font-mono font-semibold">Featured</span>
        )}
      </button>

      {error && (
        <span className="text-xs text-red-400 font-mono ml-2">{error}</span>
      )}
    </div>
  );
}
