import { useEffect, useState } from 'react';
import { TrendingUp, Award } from 'lucide-react';
import { getUserReputation, getLevelInfo } from '../../actions/reputation';
import type { UserReputation } from '../../actions/reputation';

interface ReputationBadgeProperties {
  userId: string;
  variant?: 'compact' | 'full' | 'inline';
  showProgress?: boolean;
}

export function ReputationBadge({
  userId,
  variant = 'compact',
  showProgress = false
}: ReputationBadgeProperties) {
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReputation = async () => {
      setLoading(true);
      const data = await getUserReputation(userId);
      setReputation(data);
      setLoading(false);
    };

    fetchReputation();
  }, [userId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-24 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (!reputation) {
    return null;
  }

  const levelInfo = getLevelInfo(reputation.level);
  const progressToNextLevel = reputation.level < 5
    ? ((reputation.reputation_points - levelInfo.minPoints) / (levelInfo.maxPoints - levelInfo.minPoints + 1)) * 100
    : 100;

  // Inline variant - minimal display for post cards
  if (variant === 'inline') {
    return (
      <div className="flex items-center space-x-1 text-xs font-mono">
        <Award size={12} style={{ color: levelInfo.color }} />
        <span className="text-gray-400">Lvl {reputation.level}</span>
        <span className="text-gray-600">•</span>
        <span className="text-gray-500">{reputation.reputation_points}</span>
      </div>
    );
  }

  // Compact variant - small badge for profiles
  if (variant === 'compact') {
    return (
      <div
        className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border font-mono text-sm"
        style={{
          backgroundColor: `${levelInfo.color}20`,
          borderColor: `${levelInfo.color}40`,
          color: levelInfo.color
        }}
      >
        <Award size={14} />
        <span className="font-semibold">{levelInfo.name}</span>
        <span className="text-xs opacity-70">Lvl {reputation.level}</span>
      </div>
    );
  }

  // Full variant - detailed display
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center border-2"
            style={{
              backgroundColor: `${levelInfo.color}20`,
              borderColor: levelInfo.color
            }}
          >
            <Award size={24} style={{ color: levelInfo.color }} />
          </div>
          <div>
            <h3
              className="text-lg font-bold"
              style={{ color: levelInfo.color }}
            >
              {levelInfo.name}
            </h3>
            <p className="text-xs text-gray-500">{levelInfo.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1 text-gray-400">
            <TrendingUp size={16} />
            <span className="text-2xl font-bold" style={{ color: levelInfo.color }}>
              {reputation.reputation_points}
            </span>
          </div>
          <p className="text-xs text-gray-500">reputation points</p>
        </div>
      </div>

      {showProgress && reputation.level < 5 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Level {reputation.level}</span>
            <span>Level {reputation.level + 1}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressToNextLevel}%`,
                backgroundColor: levelInfo.color
              }}
            />
          </div>
          <div className="text-xs text-gray-500 text-center">
            {levelInfo.maxPoints - reputation.reputation_points + 1} points to next level
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-xl font-bold text-terminal-blue">{reputation.posts_created}</div>
          <div className="text-xs text-gray-500">Posts</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-terminal-green">{reputation.upvotes_received}</div>
          <div className="text-xs text-gray-500">Upvotes</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-terminal-purple">{reputation.comments_made}</div>
          <div className="text-xs text-gray-500">Comments</div>
        </div>
      </div>
    </div>
  );
}
