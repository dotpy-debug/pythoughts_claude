/**
 * Zod Validation Utilities
 *
 * This module provides common validation schemas and utilities for Server Actions.
 * It ensures type-safe input validation with user-friendly error messages.
 *
 * @module validation
 */

import { z } from 'zod';

/**
 * Common Validation Schemas
 */

/**
 * Email validation with proper format checking
 */
export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email address')
  .min(3, 'Email is too short')
  .max(254, 'Email is too long')
  .toLowerCase()
  .trim();

/**
 * Password validation with security requirements
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * URL validation with protocol requirement
 */
export const urlSchema = z
  .string({ required_error: 'URL is required' })
  .url('Invalid URL format')
  .max(2048, 'URL is too long');

/**
 * Optional URL validation (allows empty string or null)
 */
export const optionalUrlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL is too long')
  .optional()
  .or(z.literal(''))
  .nullable();

/**
 * Slug validation (lowercase, numbers, hyphens only)
 */
export const slugSchema = z
  .string({ required_error: 'Slug is required' })
  .min(1, 'Slug is required')
  .max(200, 'Slug is too long')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .trim();

/**
 * UUID validation (v4 format)
 */
export const uuidSchema = z
  .string({ required_error: 'ID is required' })
  .uuid('Invalid ID format');

/**
 * Username validation
 * - 3-30 characters
 * - Alphanumeric and underscores only
 */
export const usernameSchema = z
  .string({ required_error: 'Username is required' })
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .trim();

/**
 * Hex color validation (#RRGGBB format)
 */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format. Use hex format (#RRGGBB)');

/**
 * Tag name validation
 */
export const tagNameSchema = z
  .string({ required_error: 'Tag name is required' })
  .min(2, 'Tag name must be at least 2 characters')
  .max(50, 'Tag name must be at most 50 characters')
  .trim();

/**
 * Category name validation
 */
export const categoryNameSchema = z
  .string({ required_error: 'Category name is required' })
  .min(2, 'Category name must be at least 2 characters')
  .max(100, 'Category name must be at most 100 characters')
  .trim();

/**
 * Post title validation
 */
export const postTitleSchema = z
  .string({ required_error: 'Title is required' })
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters')
  .trim();

/**
 * Post subtitle validation
 */
export const postSubtitleSchema = z
  .string()
  .max(300, 'Subtitle must be at most 300 characters')
  .optional()
  .or(z.literal(''));

/**
 * Validation Result Types
 */

/**
 * Success result with validated data
 */
export type ValidationSuccess<T> = {
  success: true;
  data: T;
};

/**
 * Failure result with field-level errors
 */
export type ValidationFailure = {
  success: false;
  errors: Record<string, string[]>;
};

/**
 * Union type for validation results
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validation Utility Functions
 */

/**
 * Safe validation with detailed error messages
 *
 * This function validates data against a Zod schema and returns a type-safe result.
 * It transforms Zod's internal error format into user-friendly field-level errors.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns ValidationResult with either validated data or field-level errors
 *
 * @example
 * ```typescript
 * const result = validateSchema(emailSchema, 'invalid-email');
 * if (result.success) {
 *   console.log(result.data); // Type-safe validated email
 * } else {
 *   console.log(result.errors); // { email: ['Invalid email address'] }
 * }
 * ```
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors into field-level error map
  const errors: Record<string, string[]> = {};

  result.error.errors.forEach((err) => {
    const path = err.path.length > 0 ? err.path.join('.') : 'root';

    if (!errors[path]) {
      errors[path] = [];
    }

    errors[path].push(err.message);
  });

  return { success: false, errors };
}

/**
 * Validate data and throw on error
 *
 * This function validates data and throws a descriptive error if validation fails.
 * Useful for scenarios where you want to handle validation errors via try/catch.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated data
 * @throws Error with formatted error messages
 *
 * @example
 * ```typescript
 * try {
 *   const email = validateOrThrow(emailSchema, 'invalid');
 * } catch (error) {
 *   console.error(error.message); // "Validation failed: Invalid email address"
 * }
 * ```
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validateSchema(schema, data);

  if (!result.success) {
    const errorMessages = Object.entries(result.errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('; ');

    throw new Error(`Validation failed: ${errorMessages}`);
  }

  return result.data;
}

/**
 * Create a validation error response
 *
 * Helper function to create standardized error responses for Server Actions.
 *
 * @param errors - Field-level error map
 * @returns Standardized error response object
 */
export function createValidationError(errors: Record<string, string[]>) {
  return {
    success: false as const,
    errors,
    error: 'Validation failed',
  };
}

/**
 * Create a success response
 *
 * Helper function to create standardized success responses for Server Actions.
 *
 * @param data - The successful result data
 * @returns Standardized success response object
 */
export function createSuccessResponse<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}

/**
 * Pagination validation schema
 */
export const paginationSchema = z.object({
  page: z
    .number({ coerce: true })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z
    .number({ coerce: true })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(10),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Sort order validation
 */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Date range validation
 */
export const dateRangeSchema = z.object({
  start: z.coerce.date({ required_error: 'Start date is required' }),
  end: z.coerce.date({ required_error: 'End date is required' }),
}).refine(
  (data) => data.end >= data.start,
  'End date must be after start date'
);

/**
 * Transform FormData to object
 *
 * Utility to extract data from FormData for validation.
 *
 * @param formData - The FormData to transform
 * @returns Plain object representation
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  formData.forEach((value, key) => {
    if (obj[key]) {
      // Handle multiple values for same key (arrays)
      if (Array.isArray(obj[key])) {
        (obj[key] as unknown[]).push(value);
      } else {
        obj[key] = [obj[key], value];
      }
    } else {
      obj[key] = value;
    }
  });

  return obj;
}
