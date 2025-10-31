/**
 * Category Schema Validation Tests
 *
 * This module tests the Zod validation schemas for category operations.
 *
 * @module schemas/__tests__/categories
 */

import { describe, it, expect } from 'vitest';
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  reorderCategoriesSchema,
} from '../categories';

describe('Category Schemas', () => {
  describe('createCategorySchema', () => {
    it('should validate valid category data', () => {
      const validData = {
        name: 'Technology',
        slug: 'technology',
        description: 'Tech posts',
        color: '#3b82f6',
        icon: '💻',
        display_order: 1,
      };

      const result = createCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Technology');
        expect(result.data.slug).toBe('technology');
      }
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'T',
        slug: 'tech',
      };

      const result = createCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        slug: 'tech',
      };

      const result = createCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid slug format', () => {
      const invalidData = {
        name: 'Technology',
        slug: 'Invalid Slug!',
      };

      const result = createCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid hex color', () => {
      const invalidData = {
        name: 'Technology',
        slug: 'tech',
        color: 'blue',
      };

      const result = createCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid hex color formats', () => {
      const validData = {
        name: 'Technology',
        slug: 'tech',
        color: '#ff5733',
      };

      const result = createCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const minimalData = {
        name: 'Technology',
        slug: 'tech',
      };

      const result = createCategorySchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBe('#6b7280');
        expect(result.data.icon).toBe('📁');
        expect(result.data.display_order).toBe(0);
      }
    });

    it('should reject negative display_order', () => {
      const invalidData = {
        name: 'Technology',
        slug: 'tech',
        display_order: -1,
      };

      const result = createCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateCategorySchema', () => {
    it('should validate valid update with UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Category',
        color: '#10b981',
      };

      const result = updateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'invalid-uuid',
        name: 'Test',
      };

      const result = updateCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow partial updates', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'New Name',
      };

      const result = updateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate is_active boolean', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        is_active: false,
      };

      const result = updateCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteCategorySchema', () => {
    it('should validate valid UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = deleteCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'not-a-uuid',
      };

      const result = deleteCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('reorderCategoriesSchema', () => {
    it('should validate valid reorder data', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        categoryOrders: [
          { id: '123e4567-e89b-12d3-a456-426614174001', display_order: 0 },
          { id: '123e4567-e89b-12d3-a456-426614174002', display_order: 1 },
          { id: '123e4567-e89b-12d3-a456-426614174003', display_order: 2 },
        ],
      };

      const result = reorderCategoriesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty categoryOrders array', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        categoryOrders: [],
      };

      const result = reorderCategoriesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject too many categories', () => {
      const categoryOrders = Array(101).fill(null).map((_, i) => ({
        id: '123e4567-e89b-12d3-a456-426614174000',
        display_order: i,
      }));

      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        categoryOrders,
      };

      const result = reorderCategoriesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative display_order', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        categoryOrders: [
          { id: '123e4567-e89b-12d3-a456-426614174001', display_order: -1 },
        ],
      };

      const result = reorderCategoriesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
