/**
 * Post Validation Schemas
 *
 * This module defines Zod schemas for blog post operations.
 * These schemas validate post creation, updates, and other post-related actions.
 *
 * @module schemas/posts
 */

import { z } from 'zod';
import { slugSchema, uuidSchema, postTitleSchema, postSubtitleSchema, optionalUrlSchema } from '@/lib/validation';

/**
 * Post status enumeration
 */
export const postStatusSchema = z.enum(['draft', 'published', 'scheduled', 'archived']);

/**
 * Create post validation schema
 *
 * Validates all required fields for creating a new blog post.
 */
export const createPostSchema = z.object({
  title: postTitleSchema,
  slug: slugSchema.optional(),
  subtitle: postSubtitleSchema,
  content_json: z.any(), // JSONContent from Tiptap - validated at runtime
  content_html: z.string().min(1, 'Content is required'),
  cover_image: optionalUrlSchema,
  cover_image_alt: z
    .string()
    .max(200, 'Image alt text must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string().min(2, 'Tag must be at least 2 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .default([]),
  category: z.string().max(100, 'Category is too long').optional().or(z.literal('')),
  status: postStatusSchema.default('draft'),
  is_draft: z.boolean().default(true),
  scheduled_at: z.coerce.date().optional().nullable(),
  reading_time: z.number().int().min(0).optional(),
});

/**
 * Update post validation schema
 *
 * All fields are optional for partial updates.
 */
export const updatePostSchema = z.object({
  id: uuidSchema,
  title: postTitleSchema.optional(),
  slug: slugSchema.optional(),
  subtitle: postSubtitleSchema,
  content_json: z.any().optional(),
  content_html: z.string().optional(),
  cover_image: optionalUrlSchema,
  cover_image_alt: z.string().max(200).optional().or(z.literal('')),
  tags: z.array(z.string()).max(10).optional(),
  category: z.string().max(100).optional().or(z.literal('')),
  status: postStatusSchema.optional(),
  is_draft: z.boolean().optional(),
  scheduled_at: z.coerce.date().optional().nullable(),
  reading_time: z.number().int().min(0).optional(),
});

/**
 * Delete post validation schema
 */
export const deletePostSchema = z.object({
  id: uuidSchema,
});

/**
 * Toggle featured post validation schema
 */
export const toggleFeaturedPostSchema = z.object({
  postId: uuidSchema,
  userId: uuidSchema,
});

/**
 * Get featured posts validation schema
 */
export const getFeaturedPostsSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),
});

/**
 * Publish post validation schema
 */
export const publishPostSchema = z.object({
  id: uuidSchema,
  scheduled_at: z.coerce.date().optional().nullable(),
});

/**
 * Schedule post validation schema
 */
export const schedulePostSchema = z.object({
  id: uuidSchema,
  scheduled_at: z.coerce.date().refine(
    (date) => date > new Date(),
    'Scheduled date must be in the future'
  ),
});

/**
 * Archive post validation schema
 */
export const archivePostSchema = z.object({
  id: uuidSchema,
});

/**
 * Clone post validation schema
 */
export const clonePostSchema = z.object({
  id: uuidSchema,
  title: postTitleSchema.optional(),
});

/**
 * Bulk delete posts validation schema
 */
export const bulkDeletePostsSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one post ID required').max(50, 'Maximum 50 posts at once'),
});

/**
 * Bulk update posts validation schema
 */
export const bulkUpdatePostsSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one post ID required').max(50, 'Maximum 50 posts at once'),
  updates: z.object({
    status: postStatusSchema.optional(),
    category: z.string().optional(),
    is_draft: z.boolean().optional(),
  }),
});

/**
 * Post search validation schema
 */
export const searchPostsSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: postStatusSchema.optional(),
  authorId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Inferred TypeScript Types
 */

export type PostStatus = z.infer<typeof postStatusSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
export type ToggleFeaturedPostInput = z.infer<typeof toggleFeaturedPostSchema>;
export type GetFeaturedPostsInput = z.infer<typeof getFeaturedPostsSchema>;
export type PublishPostInput = z.infer<typeof publishPostSchema>;
export type SchedulePostInput = z.infer<typeof schedulePostSchema>;
export type ArchivePostInput = z.infer<typeof archivePostSchema>;
export type ClonePostInput = z.infer<typeof clonePostSchema>;
export type BulkDeletePostsInput = z.infer<typeof bulkDeletePostsSchema>;
export type BulkUpdatePostsInput = z.infer<typeof bulkUpdatePostsSchema>;
export type SearchPostsInput = z.infer<typeof searchPostsSchema>;
