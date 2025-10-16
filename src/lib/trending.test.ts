import { describe, it, expect } from 'vitest';
import {
  calculateTrendingScore,
  calculateVoteVelocity,
  TRENDING_CONSTANTS,
} from './trending';

describe('Trending Algorithm', () => {
  describe('calculateTrendingScore', () => {
    it('calculates score for a new post with votes', () => {
      const post = {
        vote_count: 10,
        comment_count: 0,
        reaction_count: 0,
        created_at: new Date().toISOString(),
      };

      const score = calculateTrendingScore(post);

      // Score should be positive (log10(10) = 1, minimal age penalty for new post)
      expect(score).toBeGreaterThan(0);
      expect(typeof score).toBe('number');
    });

    it('applies logarithmic scaling to vote count', () => {
      const basePost = {
        comment_count: 0,
        reaction_count: 0,
        created_at: new Date().toISOString(),
      };

      const score10 = calculateTrendingScore({ ...basePost, vote_count: 10 });
      const score100 = calculateTrendingScore({ ...basePost, vote_count: 100 });
      const score1000 = calculateTrendingScore({ ...basePost, vote_count: 1000 });

      // log10(10) = 1, log10(100) = 2, log10(1000) = 3
      // Scores should increase logarithmically, not linearly
      expect(score100).toBeGreaterThan(score10);
      expect(score1000).toBeGreaterThan(score100);

      // The difference between 100 and 10 votes should be ~1 (log scale)
      const diff1 = score100 - score10;
      const diff2 = score1000 - score100;
      expect(Math.abs(diff1 - diff2)).toBeLessThan(0.5);
    });

    it('weights comments higher than votes', () => {
      const basePost = {
        created_at: new Date().toISOString(),
      };

      const votePost = {
        ...basePost,
        vote_count: 10,
        comment_count: 0,
        reaction_count: 0,
      };

      const commentPost = {
        ...basePost,
        vote_count: 0,
        comment_count: 5,
        reaction_count: 0,
      };

      const voteScore = calculateTrendingScore(votePost);
      const commentScore = calculateTrendingScore(commentPost);

      // 5 comments (weight 2.0) = score of 10
      // 10 votes = log10(10) = 1
      // Comments should have higher score
      expect(commentScore).toBeGreaterThan(voteScore);
    });

    it('includes reaction score in calculation', () => {
      const basePost = {
        vote_count: 10,
        comment_count: 5,
        created_at: new Date().toISOString(),
      };

      const withoutReactions = calculateTrendingScore({
        ...basePost,
        reaction_count: 0,
      });

      const withReactions = calculateTrendingScore({
        ...basePost,
        reaction_count: 20,
      });

      // Reactions with weight 0.5: 20 * 0.5 = 10 additional score
      expect(withReactions).toBeGreaterThan(withoutReactions);
      expect(withReactions - withoutReactions).toBeCloseTo(
        20 * TRENDING_CONSTANTS.REACTION_WEIGHT,
        0
      );
    });

    it('applies age penalty to older posts', () => {
      const post = {
        vote_count: 100,
        comment_count: 10,
        reaction_count: 20,
      };

      const newPost = calculateTrendingScore({
        ...post,
        created_at: new Date().toISOString(),
      });

      // Post from 24 hours ago
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 24);

      const oldPost = calculateTrendingScore({
        ...post,
        created_at: oldDate.toISOString(),
      });

      // Older post should have lower score due to age penalty
      expect(oldPost).toBeLessThan(newPost);
    });

    it('handles zero votes correctly', () => {
      const post = {
        vote_count: 0,
        comment_count: 5,
        reaction_count: 10,
        created_at: new Date().toISOString(),
      };

      const score = calculateTrendingScore(post);

      // log10(max(1, 0)) = log10(1) = 0
      // Score should still be positive from comments and reactions
      expect(score).toBeGreaterThan(0);
    });

    it('handles negative vote counts', () => {
      const post = {
        vote_count: -10,
        comment_count: 0,
        reaction_count: 0,
        created_at: new Date().toISOString(),
      };

      const score = calculateTrendingScore(post);

      // Uses absolute value: log10(max(1, abs(-10))) = log10(10) = 1
      expect(score).toBeGreaterThan(-1);
    });

    it('produces higher scores for recent posts with high engagement', () => {
      const highEngagementPost = {
        vote_count: 500,
        comment_count: 50,
        reaction_count: 100,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      };

      const lowEngagementPost = {
        vote_count: 10,
        comment_count: 1,
        reaction_count: 5,
        created_at: new Date().toISOString(),
      };

      const highScore = calculateTrendingScore(highEngagementPost);
      const lowScore = calculateTrendingScore(lowEngagementPost);

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('calculateVoteVelocity', () => {
    it('calculates votes per hour for recent post', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const velocity = calculateVoteVelocity(100, twoHoursAgo.toISOString());

      // 100 votes / 2 hours = 50 votes/hour
      expect(velocity).toBeCloseTo(50, 0);
    });

    it('calculates velocity for brand new post', () => {
      const velocity = calculateVoteVelocity(10, new Date().toISOString());

      // Very recent post should have high velocity
      // Uses max(1, hours) to prevent division by zero
      expect(velocity).toBeGreaterThan(0);
    });

    it('calculates velocity for old post', () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const velocity = calculateVoteVelocity(1000, oneWeekAgo.toISOString());

      // 1000 votes / (7 * 24) hours ≈ 5.95 votes/hour
      expect(velocity).toBeCloseTo(1000 / (7 * 24), 0);
    });

    it('handles zero votes', () => {
      const velocity = calculateVoteVelocity(0, new Date().toISOString());
      expect(velocity).toBe(0);
    });

    it('uses minimum of 1 hour to prevent division issues', () => {
      const veryRecent = new Date(Date.now() - 30 * 1000); // 30 seconds ago

      const velocity = calculateVoteVelocity(100, veryRecent.toISOString());

      // Should treat as 1 hour minimum
      expect(velocity).toBeLessThanOrEqual(100);
    });
  });

  describe('TRENDING_CONSTANTS', () => {
    it('has correct constant values', () => {
      expect(TRENDING_CONSTANTS.COMMENT_WEIGHT).toBe(2.0);
      expect(TRENDING_CONSTANTS.REACTION_WEIGHT).toBe(0.5);
      expect(TRENDING_CONSTANTS.GRAVITY).toBe(12);
      expect(TRENDING_CONSTANTS.DECAY_EXPONENT).toBe(1.8);
      expect(TRENDING_CONSTANTS.CACHE_TTL).toBe(300);
      expect(TRENDING_CONSTANTS.MAX_TRENDING_POSTS).toBe(20);
    });
  });

  describe('Trending Score Edge Cases', () => {
    it('handles posts with all engagement types', () => {
      const post = {
        vote_count: 1000,
        comment_count: 100,
        reaction_count: 500,
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      };

      const score = calculateTrendingScore(post);

      // Score should be high positive number
      expect(score).toBeGreaterThan(100);
      expect(typeof score).toBe('number');
      expect(isNaN(score)).toBe(false);
    });

    it('handles very old posts', () => {
      const veryOld = new Date();
      veryOld.setFullYear(veryOld.getFullYear() - 1);

      const post = {
        vote_count: 10000,
        comment_count: 500,
        reaction_count: 1000,
        created_at: veryOld.toISOString(),
      };

      const score = calculateTrendingScore(post);

      // Very old post should have negative score due to large age penalty
      expect(score).toBeLessThan(0);
    });
  });

  // Note: getTrendingPosts, getTrendingPostsByCategory, and invalidateTrendingCache
  // are integration functions that require Supabase and Redis connections.
  // These should be tested with integration tests in a test environment.
});
