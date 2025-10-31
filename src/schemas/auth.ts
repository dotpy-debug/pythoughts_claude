/**
 * Authentication Validation Schemas
 *
 * This module defines Zod schemas for authentication-related operations.
 * These schemas validate user input for sign-up, sign-in, password reset, etc.
 *
 * @module schemas/auth
 */

import { z } from 'zod';
import { emailSchema, passwordSchema, usernameSchema } from '@/lib/validation';

/**
 * Sign-up validation schema
 *
 * Validates user registration data including email, password, and username.
 */
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayUsername: z
    .string()
    .min(3, 'Display name must be at least 3 characters')
    .max(50, 'Display name must be at most 50 characters')
    .trim()
    .optional(),
});

/**
 * Sign-in validation schema
 *
 * Validates user login credentials.
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Password reset request schema
 *
 * Validates email for password reset request.
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset confirmation schema
 *
 * Validates new password and reset token.
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

/**
 * Change password schema
 *
 * Validates password change with current password verification.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  }
);

/**
 * Email verification schema
 *
 * Validates OTP verification code.
 */
export const emailVerificationSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .length(6, 'Verification code must be 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Invalid verification code format'),
});

/**
 * Two-factor authentication setup schema
 *
 * Validates 2FA setup with TOTP token.
 */
export const twoFactorSetupSchema = z.object({
  totpToken: z
    .string()
    .length(6, 'Token must be 6 digits')
    .regex(/^\d{6}$/, 'Token must be numeric'),
});

/**
 * Two-factor authentication verification schema
 *
 * Validates 2FA login with TOTP token.
 */
export const twoFactorVerifySchema = z.object({
  email: emailSchema,
  totpToken: z
    .string()
    .length(6, 'Token must be 6 digits')
    .regex(/^\d{6}$/, 'Token must be numeric'),
});

/**
 * Inferred TypeScript Types
 */

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type TwoFactorSetupInput = z.infer<typeof twoFactorSetupSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
