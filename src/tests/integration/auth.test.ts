/**
 * Authentication Integration Tests
 *
 * Tests the complete authentication flow including:
 * - User registration
 * - Sign in/out
 * - Session management
 * - Password validation
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTestClient,
  getServiceRoleClient,
  generateTestEmail,
  cleanupTestData,
  wait,
} from './setup';

describe('Authentication API Integration Tests', () => {
  const testEmail = generateTestEmail('auth');
  const testPassword = 'SecurePassword123!';
  let userId: string | null = null;

  afterEach(async () => {
    // Clean up created users
    if (userId) {
      try {
        const serviceClient = getServiceRoleClient();
        await serviceClient.from('profiles').delete().eq('id', userId);
        await serviceClient.auth.admin.deleteUser(userId);
        userId = null;
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    await cleanupTestData();
  });

  describe('User Registration (Sign Up)', () => {
    it('should successfully register a new user', async () => {
      const client = getTestClient();

      const { data, error } = await client.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
      expect(data.user?.id).toBeDefined();

      userId = data.user?.id || null;
    });

    it('should reject weak passwords', async () => {
      const client = getTestClient();

      const { data, error } = await client.auth.signUp({
        email: generateTestEmail('weak'),
        password: '123', // Too weak
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });

    it('should reject duplicate email registration', async () => {
      const client = getTestClient();
      const email = generateTestEmail('duplicate');

      // First registration
      const { data: firstData, error: firstError } = await client.auth.signUp({
        email,
        password: testPassword,
      });

      expect(firstError).toBeNull();
      userId = firstData.user?.id || null;

      // Wait a bit for the first user to be fully created
      await wait(500);

      // Attempt duplicate registration
      const { data: secondData, error: secondError } = await client.auth.signUp({
        email,
        password: testPassword,
      });

      // Supabase might return different errors depending on configuration
      // Either an error occurs, or user is null
      expect(secondError !== null || secondData.user === null).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const client = getTestClient();

      const { data, error } = await client.auth.signUp({
        email: 'not-an-email',
        password: testPassword,
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });
  });

  describe('User Sign In', () => {
    beforeEach(async () => {
      // Create a test user before sign-in tests
      const client = getTestClient();
      const { data, error } = await client.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (error) {
        throw new Error(`Failed to create test user for sign-in tests: ${error.message}`);
      }

      userId = data.user?.id || null;
      await wait(500); // Wait for user creation
    });

    it('should successfully sign in with valid credentials', async () => {
      const client = getTestClient();

      const { data, error } = await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
      expect(data.session).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
    });

    it('should reject sign in with wrong password', async () => {
      const client = getTestClient();

      const { data, error } = await client.auth.signInWithPassword({
        email: testEmail,
        password: 'WrongPassword123!',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should reject sign in with non-existent email', async () => {
      const client = getTestClient();

      const { data, error } = await client.auth.signInWithPassword({
        email: 'nonexistent@pythoughts-test.com',
        password: testPassword,
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should maintain session after sign in', async () => {
      const client = getTestClient();

      // Sign in
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(signInError).toBeNull();
      const sessionToken = signInData.session?.access_token;
      expect(sessionToken).toBeDefined();

      // Verify session is maintained
      const { data: sessionData, error: sessionError } = await client.auth.getSession();

      expect(sessionError).toBeNull();
      expect(sessionData.session).toBeDefined();
      expect(sessionData.session?.access_token).toBe(sessionToken);
    });
  });

  describe('User Sign Out', () => {
    beforeEach(async () => {
      // Create and sign in a test user
      const client = getTestClient();
      const { data: signUpData } = await client.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      userId = signUpData.user?.id || null;
      await wait(500);

      await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
    });

    it('should successfully sign out', async () => {
      const client = getTestClient();

      // Verify user is signed in
      const { data: beforeData } = await client.auth.getSession();
      expect(beforeData.session).toBeDefined();

      // Sign out
      const { error } = await client.auth.signOut();
      expect(error).toBeNull();

      // Verify user is signed out
      const { data: afterData } = await client.auth.getSession();
      expect(afterData.session).toBeNull();
    });

    it('should clear session after sign out', async () => {
      const client = getTestClient();

      await client.auth.signOut();

      const { data } = await client.auth.getUser();
      expect(data.user).toBeNull();
    });
  });

  describe('Session Verification', () => {
    it('should return null for unauthenticated requests', async () => {
      const client = getTestClient();

      await client.auth.signOut(); // Ensure signed out

      const { data, error } = await client.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should return valid session for authenticated user', async () => {
      const client = getTestClient();

      // Create and sign in user
      const { data: signUpData } = await client.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      userId = signUpData.user?.id || null;
      await wait(500);

      await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      // Get session
      const { data, error } = await client.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session?.user).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
      expect(data.session?.expires_at).toBeDefined();
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      // Create a test user
      const client = getTestClient();
      const { data } = await client.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      userId = data.user?.id || null;
      await wait(500);
    });

    it('should accept password reset request for existing email', async () => {
      const client = getTestClient();

      const { error } = await client.auth.resetPasswordForEmail(testEmail, {
        redirectTo: 'http://localhost:5173/reset-password',
      });

      // Note: This should not error even if email doesn't exist (security)
      expect(error).toBeNull();
    });

    it('should not reveal if email exists (security)', async () => {
      const client = getTestClient();

      const { error } = await client.auth.resetPasswordForEmail('nonexistent@pythoughts-test.com', {
        redirectTo: 'http://localhost:5173/reset-password',
      });

      // Should succeed regardless (security best practice)
      expect(error).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty email gracefully', async () => {
      const client = getTestClient();

      const { data, error } = await client.auth.signInWithPassword({
        email: '',
        password: testPassword,
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });

    it('should handle empty password gracefully', async () => {
      const client = getTestClient();

      const { data, error } = await client.auth.signInWithPassword({
        email: testEmail,
        password: '',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });

    it('should handle special characters in email', async () => {
      const client = getTestClient();
      const specialEmail = `test+special${Date.now()}@pythoughts-test.com`;

      const { data, error } = await client.auth.signUp({
        email: specialEmail,
        password: testPassword,
      });

      expect(error).toBeNull();
      expect(data.user?.email).toBe(specialEmail);

      userId = data.user?.id || null;
    });
  });
});
