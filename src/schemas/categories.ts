/**
 * Category Validation Schemas
 *
 * This module defines Zod schemas for category management operations.
 * These schemas validate category creation, updates, and other category-related actions.
 *
 * @module schemas/categories
 */

import { z } from 'zod';
import { slugSchema, uuidSchema, categoryNameSchema, hexColorSchema } from '@/lib/validation';

/**
 * Create category validation schema
 *
 * Validates all required fields for creating a new category.
 */
export const createCategorySchema = z.object({
  name: categoryNameSchema,
  slug: slugSchema,
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  color: hexColorSchema.default('#6b7280'),
  icon: z
    .string()
    .max(10, 'Icon must be at most 10 characters')
    .default('📁'),
  display_order: z
    .number({ coerce: true })
    .int('Display order must be an integer')
    .min(0, 'Display order must be non-negative')
    .default(0),
});

/**
 * Update category validation schema
 *
 * All fields except ID are optional for partial updates.
 */
export const updateCategorySchema = z.object({
  id: uuidSchema,
  name: categoryNameSchema.optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  color: hexColorSchema.optional(),
  icon: z.string().max(10).optional(),
  is_active: z.boolean().optional(),
  display_order: z.number({ coerce: true }).int().min(0).optional(),
});

/**
 * Delete category validation schema
 */
export const deleteCategorySchema = z.object({
  id: uuidSchema,
});

/**
 * Get all categories validation schema (admin)
 */
export const getAllCategoriesSchema = z.object({
  userId: uuidSchema,
});

/**
 * Reorder categories validation schema
 */
export const reorderCategoriesSchema = z.object({
  userId: uuidSchema,
  categoryOrders: z
    .array(
      z.object({
        id: uuidSchema,
        display_order: z.number().int().min(0),
      })
    )
    .min(1, 'At least one category required')
    .max(100, 'Maximum 100 categories at once'),
});

/**
 * Toggle category active status validation schema
 */
export const toggleCategoryActiveSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  is_active: z.boolean(),
});

/**
 * Get active categories validation schema
 */
export const getActiveCategoriesSchema = z.object({
  limit: z
    .number({ coerce: true })
    .int()
    .min(1)
    .max(100)
    .optional(),
  includeStats: z.boolean().default(true),
});

/**
 * Inferred TypeScript Types
 */

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
export type GetAllCategoriesInput = z.infer<typeof getAllCategoriesSchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
export type ToggleCategoryActiveInput = z.infer<typeof toggleCategoryActiveSchema>;
export type GetActiveCategoriesInput = z.infer<typeof getActiveCategoriesSchema>;
