/**
 * Validation Schemas Index
 *
 * Central export point for all Zod validation schemas.
 * Import schemas and types from this file for consistency.
 *
 * @module schemas
 *
 * @example
 * ```typescript
 * import { createPostSchema, type CreatePostInput } from '@/schemas';
 * import { validateSchema } from '@/lib/validation';
 *
 * const validation = validateSchema(createPostSchema, input);
 * ```
 */

// Authentication Schemas
export * from './auth';

// Post Schemas
export * from './posts';

// Category Schemas
export * from './categories';

// Tag Schemas
export * from './tags';

// Comment Schemas
export * from './comments';

// Profile Schemas
export * from './profiles';

/**
 * Schema Organization
 *
 * - auth.ts: Authentication and security schemas
 * - posts.ts: Blog post operation schemas
 * - categories.ts: Category management schemas
 * - tags.ts: Tag operation schemas
 * - comments.ts: Comment interaction schemas
 * - profiles.ts: User profile schemas
 *
 * For common validation utilities, import from:
 * @see {@link @/lib/validation}
 */
