/**
 * User Profile Integration Tests
 *
 * Tests user profile management:
 * - Get profile
 * - Update profile
 * - Profile statistics
 * - Avatar management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getServiceRoleClient,
  createTestUser,
  generateTestEmail,
  generateTestUsername,
  cleanupTestData,
} from './setup';

describe('User Profile Integration Tests', () => {
  let testUserId: string;
  let testUsername: string;

  beforeEach(async () => {
    testUsername = generateTestUsername('profile');
    const { userId } = await createTestUser(
      generateTestEmail('profile'),
      'TestPassword123!',
      testUsername
    );
    testUserId = userId;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Get Profile', () => {
    it('should retrieve profile by user ID', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(testUserId);
      expect(data?.username).toBe(testUsername);
    });

    it('should return null for non-existent profile', async () => {
      const client = getServiceRoleClient();
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', fakeId)
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should retrieve profile by username', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('username', testUsername)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(testUserId);
    });

    it('should include default values in profile', async () => {
      const client = getServiceRoleClient();

      const { data } = await client
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(data?.is_admin).toBeDefined();
      expect(data?.avatar_url).toBeDefined();
      expect(data?.bio).toBeDefined();
      expect(data?.created_at).toBeDefined();
      expect(data?.updated_at).toBeDefined();
    });
  });

  describe('Update Profile', () => {
    it('should update profile username', async () => {
      const client = getServiceRoleClient();
      const newUsername = generateTestUsername('updated');

      const { data, error } = await client
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.username).toBe(newUsername);
    });

    it('should update profile bio', async () => {
      const client = getServiceRoleClient();
      const newBio = 'Updated bio with new information';

      const { data, error } = await client
        .from('profiles')
        .update({ bio: newBio })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.bio).toBe(newBio);
    });

    it('should update avatar URL', async () => {
      const client = getServiceRoleClient();
      const newAvatarUrl = 'https://via.placeholder.com/200';

      const { data, error } = await client
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.avatar_url).toBe(newAvatarUrl);
    });

    it('should update multiple fields at once', async () => {
      const client = getServiceRoleClient();

      const updates = {
        username: generateTestUsername('multi'),
        bio: 'New bio',
        avatar_url: 'https://via.placeholder.com/300',
      };

      const { data, error } = await client
        .from('profiles')
        .update(updates)
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.username).toBe(updates.username);
      expect(data?.bio).toBe(updates.bio);
      expect(data?.avatar_url).toBe(updates.avatar_url);
    });

    it('should enforce unique username constraint', async () => {
      const client = getServiceRoleClient();

      // Create another user
      const otherUsername = generateTestUsername('other');
      await createTestUser(
        generateTestEmail('other'),
        'TestPassword456!',
        otherUsername
      );

      // Try to update first user to use other user's username
      const { data, error } = await client
        .from('profiles')
        .update({ username: otherUsername })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should update updated_at timestamp', async () => {
      const client = getServiceRoleClient();

      // Get original timestamp
      const { data: original } = await client
        .from('profiles')
        .select('updated_at')
        .eq('id', testUserId)
        .single();

      // Update profile
      await client
        .from('profiles')
        .update({ bio: 'New bio' })
        .eq('id', testUserId);

      // Check new timestamp
      const { data: updated } = await client
        .from('profiles')
        .select('updated_at')
        .eq('id', testUserId)
        .single();

      expect(new Date(updated?.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(original?.updated_at).getTime()
      );
    });
  });

  describe('Admin Status', () => {
    it('should default is_admin to false', async () => {
      const client = getServiceRoleClient();

      const { data } = await client
        .from('profiles')
        .select('is_admin')
        .eq('id', testUserId)
        .single();

      expect(data?.is_admin).toBe(false);
    });

    it('should allow updating admin status', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.is_admin).toBe(true);
    });
  });

  describe('Profile Extended Information', () => {
    it('should store extended profile information', async () => {
      const client = getServiceRoleClient();

      // Check if user_profile_extended table exists
      const { data: extendedProfile, error } = await client
        .from('user_profile_extended')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      // May not exist if not created yet
      if (error) {
        // Create extended profile
        const { data: created, error: createError } = await client
          .from('user_profile_extended')
          .insert({
            user_id: testUserId,
            bio_extended: 'Extended bio',
            website: 'https://example.com',
            location: 'Test City',
            company: 'Test Company',
            job_title: 'Developer',
          })
          .select()
          .single();

        expect(createError).toBeNull();
        expect(created?.user_id).toBe(testUserId);
      } else {
        expect(extendedProfile?.user_id).toBe(testUserId);
      }
    });
  });

  describe('List Profiles', () => {
    beforeEach(async () => {
      // Create additional test users
      await createTestUser(
        generateTestEmail('user2'),
        'TestPassword123!',
        generateTestUsername('user2')
      );
      await createTestUser(
        generateTestEmail('user3'),
        'TestPassword123!',
        generateTestUsername('user3')
      );
    });

    it('should retrieve multiple profiles', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(3);
    });

    it('should search profiles by username pattern', async () => {
      const client = getServiceRoleClient();

      const searchPattern = `%${testUsername.substring(0, 10)}%`;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .ilike('username', searchPattern);

      expect(error).toBeNull();
      expect(data?.some(profile => profile.id === testUserId)).toBe(true);
    });
  });

  describe('Profile Statistics', () => {
    it('should track profile creation timestamp', async () => {
      const client = getServiceRoleClient();

      const { data } = await client
        .from('profiles')
        .select('created_at')
        .eq('id', testUserId)
        .single();

      const createdAt = new Date(data?.created_at);
      const now = new Date();

      expect(createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(createdAt.getTime()).toBeGreaterThan(now.getTime() - 10000); // Within last 10s
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long bio', async () => {
      const client = getServiceRoleClient();
      const longBio = 'A'.repeat(5000);

      const { data, error } = await client
        .from('profiles')
        .update({ bio: longBio })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.bio.length).toBe(5000);
    });

    it('should handle special characters in username', async () => {
      const client = getServiceRoleClient();
      const specialUsername = `user_${Date.now()}_test-123`;

      const { data, error } = await client
        .from('profiles')
        .update({ username: specialUsername })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.username).toBe(specialUsername);
    });

    it('should handle special characters in bio', async () => {
      const client = getServiceRoleClient();
      const specialBio = 'Test bio with <tags> and **markdown** and emojis 🚀';

      const { data, error } = await client
        .from('profiles')
        .update({ bio: specialBio })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.bio).toBe(specialBio);
    });

    it('should handle empty bio', async () => {
      const client = getServiceRoleClient();

      const { data, error } = await client
        .from('profiles')
        .update({ bio: '' })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.bio).toBe('');
    });

    it('should validate avatar URL format (if validation exists)', async () => {
      const client = getServiceRoleClient();

      // Test with valid URL
      const validUrl = 'https://example.com/avatar.jpg';
      const { error: validError } = await client
        .from('profiles')
        .update({ avatar_url: validUrl })
        .eq('id', testUserId);

      expect(validError).toBeNull();

      // Test with empty string (should be allowed)
      const { error: emptyError } = await client
        .from('profiles')
        .update({ avatar_url: '' })
        .eq('id', testUserId);

      expect(emptyError).toBeNull();
    });
  });

  describe('Profile Deletion', () => {
    it('should delete profile', async () => {
      const client = getServiceRoleClient();

      const { error } = await client
        .from('profiles')
        .delete()
        .eq('id', testUserId);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await client
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(data).toBeNull();
    });
  });
});
