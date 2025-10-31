import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { UserReputationWithProfile } from '../types/common';

export type UserReputation = {
  user_id: string;
  reputation_points: number;
  level: number;
  posts_created: number;
  comments_made: number;
  upvotes_received: number;
  helpful_count: number;
  updated_at: string;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'engagement' | 'quality' | 'milestone' | 'special';
  color: string;
  requirement_type: string;
  requirement_value: number;
  is_active: boolean;
  created_at: string;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  is_featured: boolean;
  badges?: Badge;
};

/**
 * Get user reputation data
 */
export async function getUserReputation(userId: string): Promise<UserReputation | null> {
  try {
    const { data, error } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user reputation', error as Error, { userId });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Unexpected error in getUserReputation', error as Error, { userId });
    return null;
  }
}

/**
 * Get all badges earned by a user
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges (
          id,
          name,
          description,
          icon,
          category,
          color,
          requirement_type,
          requirement_value,
          is_active,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      logger.error('Error fetching user badges', error as Error, { userId });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getUserBadges', error as Error, { userId });
    return [];
  }
}

/**
 * Get featured badges for a user
 */
export async function getFeaturedBadges(userId: string): Promise<UserBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges (
          id,
          name,
          description,
          icon,
          category,
          color,
          requirement_type,
          requirement_value,
          is_active,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_featured', true)
      .order('earned_at', { ascending: false })
      .limit(3);

    if (error) {
      logger.error('Error fetching featured badges', error as Error, { userId });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getFeaturedBadges', error as Error, { userId });
    return [];
  }
}

/**
 * Toggle badge featured status
 * Users can feature up to 3 badges on their profile
 */
export async function toggleBadgeFeatured(
  badgeId: string,
  userId: string
): Promise<{ success: boolean; error?: string; is_featured?: boolean }> {
  try {
    // Get current badge status
    const { data: userBadge, error: fetchError } = await supabase
      .from('user_badges')
      .select('is_featured')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single();

    if (fetchError || !userBadge) {
      logger.error('Error fetching user badge', fetchError as Error, { fetchError, userId, badgeId });
      return { success: false, error: 'Badge not found' };
    }

    const newFeaturedStatus = !userBadge.is_featured;

    // If featuring a badge, check if user already has 3 featured badges
    if (newFeaturedStatus) {
      const { count, error: countError } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_featured', true);

      if (countError) {
        logger.error('Error counting featured badges', countError as Error, { countError, userId });
        return { success: false, error: 'Failed to check featured badges' };
      }

      if (count && count >= 3) {
        return { success: false, error: 'You can only feature up to 3 badges' };
      }
    }

    // Update featured status
    const { error: updateError } = await supabase
      .from('user_badges')
      .update({ is_featured: newFeaturedStatus })
      .eq('user_id', userId)
      .eq('badge_id', badgeId);

    if (updateError) {
      logger.error('Error toggling badge featured status', updateError as Error, { updateError, userId, badgeId });
      return { success: false, error: 'Failed to update badge' };
    }

    logger.info('Badge featured status toggled', { userId, badgeId, is_featured: newFeaturedStatus });
    return { success: true, is_featured: newFeaturedStatus };
  } catch (error) {
    logger.error('Unexpected error in toggleBadgeFeatured', error as Error, { userId, badgeId });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all available badges
 */
export async function getAllBadges(): Promise<Badge[]> {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('requirement_value');

    if (error) {
      logger.error('Error fetching all badges', error as Error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getAllBadges', error as Error);
    return [];
  }
}

/**
 * Get top users by reputation
 */
export async function getTopUsersByReputation(limit: number = 10): Promise<UserReputationWithProfile[]> {
  try {
    const { data, error } = await supabase
      .from('user_reputation')
      .select(`
        *,
        profiles!user_reputation_user_id_fkey (
          id,
          username,
          display_username,
          avatar_url,
          bio
        )
      `)
      .order('reputation_points', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching top users by reputation', error as Error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Unexpected error in getTopUsersByReputation', error as Error);
    return [];
  }
}

/**
 * Get level name and description
 */
export function getLevelInfo(level: number): { name: string; description: string; color: string; minPoints: number; maxPoints: number } {
  const levels = {
    1: { name: 'Newcomer', description: 'Just getting started', color: '#9ca3af', minPoints: 0, maxPoints: 99 },
    2: { name: 'Contributor', description: 'Making your mark', color: '#3b82f6', minPoints: 100, maxPoints: 499 },
    3: { name: 'Regular', description: 'Active community member', color: '#8b5cf6', minPoints: 500, maxPoints: 1499 },
    4: { name: 'Expert', description: 'Highly valued contributor', color: '#f59e0b', minPoints: 1500, maxPoints: 4999 },
    5: { name: 'Master', description: 'Community leader', color: '#ef4444', minPoints: 5000, maxPoints: Infinity },
  };

  return levels[level as keyof typeof levels] || levels[1];
}
