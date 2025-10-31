/**
 * Validation Utilities Tests
 *
 * This module tests the common validation utilities and schemas.
 *
 * @module schemas/__tests__/validation
 */

import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  urlSchema,
  slugSchema,
  uuidSchema,
  usernameSchema,
  hexColorSchema,
  validateSchema,
  validateOrThrow,
  paginationSchema,
  dateRangeSchema,
} from '../../lib/validation';
import { z } from 'zod';

describe('Validation Utilities', () => {
  describe('emailSchema', () => {
    it('should validate valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'test+tag@example.com',
      ];

      validEmails.forEach(email => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user name@example.com',
      ];

      invalidEmails.forEach(email => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      });
    });

    it('should convert email to lowercase', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should trim whitespace', () => {
      const result = emailSchema.safeParse('  test@example.com  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong password', () => {
      const result = passwordSchema.safeParse('Test1234');
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('test1234');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('TEST1234');
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('TestTest');
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Test123');
      expect(result.success).toBe(false);
    });

    it('should reject password longer than 128 characters', () => {
      const result = passwordSchema.safeParse('Test1234' + 'a'.repeat(130));
      expect(result.success).toBe(false);
    });
  });

  describe('urlSchema', () => {
    it('should validate valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/path',
        'https://subdomain.example.com',
      ];

      validUrls.forEach(url => {
        const result = urlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'example.com',
        'ftp://example.com',
      ];

      invalidUrls.forEach(url => {
        const result = urlSchema.safeParse(url);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('slugSchema', () => {
    it('should validate valid slugs', () => {
      const validSlugs = [
        'test-slug',
        'test123',
        'test-slug-123',
      ];

      validSlugs.forEach(slug => {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid slugs', () => {
      const invalidSlugs = [
        'Test Slug',
        'test_slug',
        'test-slug!',
        'TEST-SLUG',
      ];

      invalidSlugs.forEach(slug => {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('uuidSchema', () => {
    it('should validate valid UUID', () => {
      const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });
  });

  describe('usernameSchema', () => {
    it('should validate valid usernames', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'TestUser',
      ];

      validUsernames.forEach(username => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(true);
      });
    });

    it('should reject username shorter than 3 characters', () => {
      const result = usernameSchema.safeParse('ab');
      expect(result.success).toBe(false);
    });

    it('should reject username longer than 30 characters', () => {
      const result = usernameSchema.safeParse('a'.repeat(31));
      expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
      const result = usernameSchema.safeParse('user@name');
      expect(result.success).toBe(false);
    });
  });

  describe('hexColorSchema', () => {
    it('should validate valid hex colors', () => {
      const validColors = [
        '#000000',
        '#ffffff',
        '#3b82f6',
        '#FF5733',
      ];

      validColors.forEach(color => {
        const result = hexColorSchema.safeParse(color);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'blue',
        '#fff',
        '#gggggg',
        'ffffff',
      ];

      invalidColors.forEach(color => {
        const result = hexColorSchema.safeParse(color);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateSchema', () => {
    const testSchema = z.object({
      name: z.string().min(3),
      age: z.number().min(0),
    });

    it('should return success for valid data', () => {
      const result = validateSchema(testSchema, { name: 'John', age: 25 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 25 });
      }
    });

    it('should return field-level errors for invalid data', () => {
      const result = validateSchema(testSchema, { name: 'Jo', age: -1 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveProperty('name');
        expect(result.errors).toHaveProperty('age');
      }
    });

    it('should handle nested field errors', () => {
      const nestedSchema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const result = validateSchema(nestedSchema, {
        user: { email: 'invalid' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveProperty('user.email');
      }
    });
  });

  describe('validateOrThrow', () => {
    const testSchema = z.string().min(3);

    it('should return data for valid input', () => {
      const result = validateOrThrow(testSchema, 'test');
      expect(result).toBe('test');
    });

    it('should throw error for invalid input', () => {
      expect(() => {
        validateOrThrow(testSchema, 'ab');
      }).toThrow('Validation failed');
    });
  });

  describe('paginationSchema', () => {
    it('should validate valid pagination', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should apply default values', () => {
      const result = paginationSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should coerce string numbers', () => {
      const result = paginationSchema.safeParse({ page: '2', limit: '20' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate valid date range', () => {
      const result = dateRangeSchema.safeParse({
        start: '2025-01-01',
        end: '2025-12-31',
      });

      expect(result.success).toBe(true);
    });

    it('should reject end date before start date', () => {
      const result = dateRangeSchema.safeParse({
        start: '2025-12-31',
        end: '2025-01-01',
      });

      expect(result.success).toBe(false);
    });

    it('should accept same start and end date', () => {
      const result = dateRangeSchema.safeParse({
        start: '2025-01-01',
        end: '2025-01-01',
      });

      expect(result.success).toBe(true);
    });
  });
});
