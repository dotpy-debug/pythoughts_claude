/**
 * Post Schema Validation Tests
 *
 * This module tests the Zod validation schemas for post operations.
 *
 * @module schemas/__tests__/posts
 */

import { describe, it, expect } from 'vitest';
import {
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  toggleFeaturedPostSchema,
  getFeaturedPostsSchema,
  publishPostSchema,
  schedulePostSchema,
} from '../posts';

describe('Post Schemas', () => {
  describe('createPostSchema', () => {
    it('should validate valid post data', () => {
      const validData = {
        title: 'Test Post',
        content_json: { type: 'doc', content: [] },
        content_html: '<p>Test content</p>',
        tags: ['typescript', 'testing'],
        status: 'draft',
      };

      const result = createPostSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Post');
        expect(result.data.tags).toEqual(['typescript', 'testing']);
      }
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
        content_html: '<p>Test</p>',
        tags: [],
      };

      const result = createPostSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject too many tags', () => {
      const invalidData = {
        title: 'Test',
        content_html: '<p>Test</p>',
        tags: Array.from({length: 15}).fill('tag'), // More than 10
      };

      const result = createPostSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 200 characters', () => {
      const invalidData = {
        title: 'a'.repeat(201),
        content_html: '<p>Test</p>',
        tags: [],
      };

      const result = createPostSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid optional fields', () => {
      const validData = {
        title: 'Test Post',
        subtitle: 'This is a subtitle',
        content_html: '<p>Test</p>',
        cover_image: 'https://example.com/image.jpg',
        cover_image_alt: 'Test image',
        category: 'technology',
        tags: ['test'],
      };

      const result = createPostSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid cover image URL', () => {
      const invalidData = {
        title: 'Test',
        content_html: '<p>Test</p>',
        cover_image: 'not-a-url',
        tags: [],
      };

      const result = createPostSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const minimalData = {
        title: 'Test',
        content_html: '<p>Test</p>',
        content_json: {},
      };

      const result = createPostSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('draft');
        expect(result.data.is_draft).toBe(true);
        expect(result.data.tags).toEqual([]);
      }
    });
  });

  describe('updatePostSchema', () => {
    it('should validate valid update data with UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated Title',
        tags: ['updated'],
      };

      const result = updatePostSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'not-a-uuid',
        title: 'Test',
      };

      const result = updatePostSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow partial updates', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Only Title',
      };

      const result = updatePostSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('deletePostSchema', () => {
    it('should validate valid UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = deletePostSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'invalid-uuid',
      };

      const result = deletePostSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('toggleFeaturedPostSchema', () => {
    it('should validate valid post and user IDs', () => {
      const validData = {
        postId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = toggleFeaturedPostSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      const invalidData = {
        postId: 'invalid',
        userId: 'invalid',
      };

      const result = toggleFeaturedPostSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('getFeaturedPostsSchema', () => {
    it('should validate valid limit', () => {
      const validData = { limit: 10 };

      const result = getFeaturedPostsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });

    it('should apply default limit', () => {
      const result = getFeaturedPostsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
      }
    });

    it('should reject limit over 50', () => {
      const invalidData = { limit: 100 };

      const result = getFeaturedPostsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative limit', () => {
      const invalidData = { limit: -1 };

      const result = getFeaturedPostsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('publishPostSchema', () => {
    it('should validate post ID with optional schedule', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = publishPostSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept scheduled_at date', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        scheduled_at: new Date('2025-12-31'),
      };

      const result = publishPostSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('schedulePostSchema', () => {
    it('should validate future scheduled date', () => {
      const futureDate = new Date(Date.now() + 86_400_000); // Tomorrow
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        scheduled_at: futureDate,
      };

      const result = schedulePostSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject past scheduled date', () => {
      const pastDate = new Date(Date.now() - 86_400_000); // Yesterday
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        scheduled_at: pastDate,
      };

      const result = schedulePostSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
