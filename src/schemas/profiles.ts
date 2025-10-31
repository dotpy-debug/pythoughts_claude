/**
 * Profile Validation Schemas
 *
 * This module defines Zod schemas for user profile operations.
 * These schemas validate profile updates and user information.
 *
 * @module schemas/profiles
 */

import { z } from 'zod';
import { usernameSchema, uuidSchema, optionalUrlSchema } from '@/lib/validation';

/**
 * Update profile validation schema
 *
 * Validates profile update fields with optional values.
 */
export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  display_username: z
    .string()
    .min(3, 'Display name must be at least 3 characters')
    .max(50, 'Display name must be at most 50 characters')
    .trim()
    .optional(),
  avatar_url: optionalUrlSchema,
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional().or(z.literal('')),
  location: z
    .string()
    .max(100, 'Location must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  website: optionalUrlSchema,
  twitter_handle: z
    .string()
    .max(15, 'Twitter handle must be at most 15 characters')
    .regex(/^[a-zA-Z0-9_]*$/, 'Twitter handle can only contain letters, numbers, and underscores')
    .optional()
    .or(z.literal('')),
  github_username: z
    .string()
    .max(39, 'GitHub username must be at most 39 characters')
    .regex(/^[a-zA-Z0-9-]*$/, 'GitHub username can only contain letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  linkedin_url: optionalUrlSchema,
});

/**
 * Get profile validation schema
 */
export const getProfileSchema = z
  .object({
    userId: uuidSchema.optional(),
    username: usernameSchema.optional(),
  })
  .refine((data) => data.userId || data.username, 'Either userId or username must be provided');

/**
 * Update profile settings validation schema
 */
export const updateProfileSettingsSchema = z.object({
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  newsletter_subscription: z.boolean().optional(),
  show_email_publicly: z.boolean().optional(),
  show_stats_publicly: z.boolean().optional(),
  allow_comments: z.boolean().optional(),
  allow_messages: z.boolean().optional(),
});

/**
 * Block user validation schema
 */
export const blockUserSchema = z
  .object({
    userId: uuidSchema,
    blockedUserId: uuidSchema,
  })
  .refine((data) => data.userId !== data.blockedUserId, 'Cannot block yourself');

/**
 * Unblock user validation schema
 */
export const unblockUserSchema = z.object({
  userId: uuidSchema,
  blockedUserId: uuidSchema,
});

/**
 * Follow user validation schema
 */
export const followUserSchema = z
  .object({
    userId: uuidSchema,
    followedUserId: uuidSchema,
  })
  .refine((data) => data.userId !== data.followedUserId, 'Cannot follow yourself');

/**
 * Unfollow user validation schema
 */
export const unfollowUserSchema = z.object({
  userId: uuidSchema,
  followedUserId: uuidSchema,
});

/**
 * Get user followers validation schema
 */
export const getUserFollowersSchema = z.object({
  userId: uuidSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Get user following validation schema
 */
export const getUserFollowingSchema = z.object({
  userId: uuidSchema,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Inferred TypeScript Types
 */

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type GetProfileInput = z.infer<typeof getProfileSchema>;
export type UpdateProfileSettingsInput = z.infer<typeof updateProfileSettingsSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type UnblockUserInput = z.infer<typeof unblockUserSchema>;
export type FollowUserInput = z.infer<typeof followUserSchema>;
export type UnfollowUserInput = z.infer<typeof unfollowUserSchema>;
export type GetUserFollowersInput = z.infer<typeof getUserFollowersSchema>;
export type GetUserFollowingInput = z.infer<typeof getUserFollowingSchema>;
