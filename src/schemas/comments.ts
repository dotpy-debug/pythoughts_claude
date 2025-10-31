/**
 * Comment Validation Schemas
 *
 * This module defines Zod schemas for comment operations.
 * These schemas validate comment creation, updates, and moderation.
 *
 * @module schemas/comments
 */

import { z } from 'zod';
import { uuidSchema } from '@/lib/validation';

/**
 * Create comment validation schema
 *
 * Validates comment content and association with posts.
 */
export const createCommentSchema = z.object({
  post_id: uuidSchema,
  content: z
    .string({ required_error: 'Comment content is required' })
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment must be at most 5000 characters')
    .trim(),
  parent_id: uuidSchema.optional().nullable(),
});

/**
 * Update comment validation schema
 *
 * Allows updating comment content only.
 */
export const updateCommentSchema = z.object({
  id: uuidSchema,
  content: z
    .string({ required_error: 'Comment content is required' })
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment must be at most 5000 characters')
    .trim(),
});

/**
 * Delete comment validation schema
 */
export const deleteCommentSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
});

/**
 * Get comments validation schema
 */
export const getCommentsSchema = z.object({
  post_id: uuidSchema,
  limit: z
    .number({ coerce: true })
    .int()
    .min(1)
    .max(100)
    .default(50),
  offset: z.number({ coerce: true }).int().min(0).default(0),
  sort: z.enum(['newest', 'oldest', 'popular']).default('newest'),
});

/**
 * Get comment replies validation schema
 */
export const getCommentRepliesSchema = z.object({
  parent_id: uuidSchema,
  limit: z.number({ coerce: true }).int().min(1).max(50).default(20),
  offset: z.number({ coerce: true }).int().min(0).default(0),
});

/**
 * Vote on comment validation schema
 */
export const voteCommentSchema = z.object({
  comment_id: uuidSchema,
  user_id: uuidSchema,
  vote_type: z.enum(['upvote', 'downvote', 'remove']),
});

/**
 * Report comment validation schema
 */
export const reportCommentSchema = z.object({
  comment_id: uuidSchema,
  user_id: uuidSchema,
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'misinformation', 'other']),
  details: z
    .string()
    .max(500, 'Report details must be at most 500 characters')
    .optional()
    .or(z.literal('')),
});

/**
 * Pin comment validation schema (admin/moderator)
 */
export const pinCommentSchema = z.object({
  comment_id: uuidSchema,
  user_id: uuidSchema,
  is_pinned: z.boolean(),
});

/**
 * Moderate comment validation schema (admin/moderator)
 */
export const moderateCommentSchema = z.object({
  comment_id: uuidSchema,
  moderator_id: uuidSchema,
  action: z.enum(['approve', 'reject', 'flag', 'remove']),
  reason: z.string().max(500).optional().or(z.literal('')),
});

/**
 * Bulk delete comments validation schema
 */
export const bulkDeleteCommentsSchema = z.object({
  comment_ids: z
    .array(uuidSchema)
    .min(1, 'At least one comment ID required')
    .max(50, 'Maximum 50 comments at once'),
  user_id: uuidSchema,
});

/**
 * Inferred TypeScript Types
 */

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
export type GetCommentRepliesInput = z.infer<typeof getCommentRepliesSchema>;
export type VoteCommentInput = z.infer<typeof voteCommentSchema>;
export type ReportCommentInput = z.infer<typeof reportCommentSchema>;
export type PinCommentInput = z.infer<typeof pinCommentSchema>;
export type ModerateCommentInput = z.infer<typeof moderateCommentSchema>;
export type BulkDeleteCommentsInput = z.infer<typeof bulkDeleteCommentsSchema>;
