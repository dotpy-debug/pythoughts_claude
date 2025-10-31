/**
 * Tag Validation Schemas
 *
 * This module defines Zod schemas for tag management operations.
 * These schemas validate tag operations including following, searching, and retrieval.
 *
 * @module schemas/tags
 */

import { z } from 'zod';
import { slugSchema, uuidSchema, tagNameSchema } from '@/lib/validation';

/**
 * Get popular tags validation schema
 */
export const getPopularTagsSchema = z.object({
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(50),
  userId: uuidSchema.optional(),
});

/**
 * Get trending tags validation schema
 */
export const getTrendingTagsSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),
  days: z.coerce
    .number()
    .int()
    .min(1, 'Days must be at least 1')
    .max(365, 'Days must be at most 365')
    .default(7),
});

/**
 * Get tag details validation schema
 */
export const getTagDetailsSchema = z.object({
  tagSlug: slugSchema,
  userId: uuidSchema.optional(),
});

/**
 * Follow tag validation schema
 */
export const followTagSchema = z.object({
  tagId: uuidSchema,
  userId: uuidSchema,
});

/**
 * Unfollow tag validation schema
 */
export const unfollowTagSchema = z.object({
  tagId: uuidSchema,
  userId: uuidSchema,
});

/**
 * Get user followed tags validation schema
 */
export const getUserFollowedTagsSchema = z.object({
  userId: uuidSchema,
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * Search tags validation schema
 */
export const searchTagsSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Query is too long')
    .trim(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

/**
 * Create tag validation schema (admin/system)
 */
export const createTagSchema = z.object({
  name: tagNameSchema,
  slug: slugSchema,
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .or(z.literal('')),
});

/**
 * Update tag validation schema (admin)
 */
export const updateTagSchema = z.object({
  id: uuidSchema,
  name: tagNameSchema.optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional().or(z.literal('')),
});

/**
 * Delete tag validation schema (admin)
 */
export const deleteTagSchema = z.object({
  id: uuidSchema,
});

/**
 * Merge tags validation schema (admin)
 *
 * Merges multiple tags into a single target tag.
 */
export const mergeTagsSchema = z.object({
  sourceTagIds: z
    .array(uuidSchema)
    .min(1, 'At least one source tag required')
    .max(10, 'Maximum 10 source tags at once'),
  targetTagId: uuidSchema,
});

/**
 * Bulk tag operations validation schema
 */
export const bulkTagOperationSchema = z.object({
  tagIds: z
    .array(uuidSchema)
    .min(1, 'At least one tag ID required')
    .max(50, 'Maximum 50 tags at once'),
  operation: z.enum(['delete', 'merge', 'activate', 'deactivate']),
  targetId: uuidSchema.optional(), // Required for merge operation
});

/**
 * Inferred TypeScript Types
 */

export type GetPopularTagsInput = z.infer<typeof getPopularTagsSchema>;
export type GetTrendingTagsInput = z.infer<typeof getTrendingTagsSchema>;
export type GetTagDetailsInput = z.infer<typeof getTagDetailsSchema>;
export type FollowTagInput = z.infer<typeof followTagSchema>;
export type UnfollowTagInput = z.infer<typeof unfollowTagSchema>;
export type GetUserFollowedTagsInput = z.infer<typeof getUserFollowedTagsSchema>;
export type SearchTagsInput = z.infer<typeof searchTagsSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type DeleteTagInput = z.infer<typeof deleteTagSchema>;
export type MergeTagsInput = z.infer<typeof mergeTagsSchema>;
export type BulkTagOperationInput = z.infer<typeof bulkTagOperationSchema>;
