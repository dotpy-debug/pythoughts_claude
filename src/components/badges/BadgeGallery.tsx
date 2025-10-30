import { useEffect, useState } from 'react';
import { Award, Star, Lock } from 'lucide-react';
import { getUserBadges, getAllBadges, toggleBadgeFeatured } from '../../actions/reputation';
import { useAuth } from '../../contexts/AuthContext';
import type { UserBadge, Badge } from '../../actions/reputation';
import { logger } from '../../lib/logger';

interface BadgeGalleryProps {
  userId: string;
  variant?: 'full' | 'compact';
}

export function BadgeGallery({ userId, variant = 'full' }: BadgeGalleryProps) {
  const { user } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    const fetchBadges = async () => {
      setLoading(true);
      const [earned, all] = await Promise.all([
        getUserBadges(userId),
        getAllBadges()
      ]);
      setEarnedBadges(earned);
      setAllBadges(all);
      setLoading(false);
    };

    fetchBadges();
  }, [userId]);

  const handleToggleFeatured = async (badgeId: string) => {
    if (!user || !isOwnProfile) return;

    setToggling(badgeId);
    try {
      const result = await toggleBadgeFeatured(badgeId, user.id);

      if (result.success) {
        // Update local state
        setEarnedBadges(prev =>
          prev.map(b =>
            b.badge_id === badgeId
              ? { ...b, is_featured: result.is_featured ?? false }
              : b
          )
        );
      } else {
        logger.error('Failed to toggle badge featured status', result.error ? new Error(result.error) : new Error('Unknown error'));
        alert(result.error || 'Failed to update badge');
      }
    } catch (error) {
      logger.error('Error toggling badge featured status', { errorDetails: error });
      alert('An unexpected error occurred');
    } finally {
      setToggling(null);
    }
  };

  const earnedBadgeIds = new Set(earnedBadges.map(b => b.badge_id));

  // Group badges by category
  const badgesByCategory = allBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-32"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Compact variant - show only featured badges
  if (variant === 'compact') {
    const featuredBadges = earnedBadges.filter(b => b.is_featured);

    if (featuredBadges.length === 0) {
      return null;
    }

    return (
      <div className="flex items-center space-x-2">
        {featuredBadges.map(userBadge => {
          const badge = userBadge.badges;
          if (!badge) return null;

          return (
            <div
              key={userBadge.id}
              className="flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-mono"
              style={{
                backgroundColor: `${badge.color}20`,
                borderColor: `${badge.color}40`,
                color: badge.color
              }}
              title={badge.description}
            >
              <span>{badge.icon}</span>
              <span className="font-semibold">{badge.name}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Full variant - show all badges organized by category
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Award className="text-terminal-purple" size={24} />
        <h2 className="text-xl font-bold text-gray-100 font-mono">
          Badges ({earnedBadges.length}/{allBadges.length})
        </h2>
      </div>

      {Object.entries(badgesByCategory).map(([category, badges]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider font-mono">
            {category}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {badges.map(badge => {
              const userBadge = earnedBadges.find(b => b.badge_id === badge.id);
              const isEarned = earnedBadgeIds.has(badge.id);
              const isFeatured = userBadge?.is_featured || false;

              return (
                <div
                  key={badge.id}
                  className={`relative p-4 rounded-lg border transition-all ${
                    isEarned
                      ? 'bg-gray-900 border-gray-700 hover:border-gray-600'
                      : 'bg-gray-900/50 border-gray-800 opacity-50'
                  }`}
                  style={
                    isEarned
                      ? {
                          borderColor: `${badge.color}40`,
                        }
                      : {}
                  }
                >
                  {isOwnProfile && isEarned && (
                    <button
                      onClick={() => handleToggleFeatured(badge.id)}
                      disabled={toggling === badge.id}
                      className={`absolute top-2 right-2 p-1 rounded transition-colors ${
                        isFeatured
                          ? 'text-yellow-400 hover:text-yellow-300'
                          : 'text-gray-600 hover:text-gray-400'
                      }`}
                      title={isFeatured ? 'Remove from featured' : 'Add to featured (max 3)'}
                    >
                      <Star size={14} className={isFeatured ? 'fill-current' : ''} />
                    </button>
                  )}

                  <div className="flex flex-col items-center space-y-2 text-center">
                    <div
                      className={`text-3xl ${!isEarned && 'grayscale opacity-30'}`}
                    >
                      {isEarned ? badge.icon : <Lock size={32} className="text-gray-700" />}
                    </div>
                    <div>
                      <div
                        className={`font-semibold font-mono text-sm ${
                          isEarned ? '' : 'text-gray-600'
                        }`}
                        style={isEarned ? { color: badge.color } : {}}
                      >
                        {badge.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {badge.description}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 font-mono">
                        {badge.requirement_type.replace(/_/g, ' ')}: {badge.requirement_value}
                      </div>
                    </div>

                    {isEarned && userBadge && (
                      <div className="text-xs text-gray-500 font-mono">
                        Earned {new Date(userBadge.earned_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {isOwnProfile && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-start space-x-2 text-sm text-gray-400 font-mono">
            <Star size={16} className="text-yellow-400 mt-0.5" />
            <div>
              <div className="text-gray-300 font-semibold mb-1">Featured Badges</div>
              <div>
                Click the star icon to feature up to 3 badges on your profile. Featured badges are
                displayed prominently to showcase your achievements.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
