/**
 * Integration Test Setup and Utilities
 *
 * Provides test fixtures, helper functions, and cleanup utilities for integration tests.
 * Includes Supabase client setup with service role for administrative test operations.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Test user credentials for authentication tests
export const TEST_USERS = {
  primary: {
    email: 'test-user-primary@pythoughts-test.com',
    password: 'TestPassword123!',
    username: 'test_user_primary',
  },
  secondary: {
    email: 'test-user-secondary@pythoughts-test.com',
    password: 'TestPassword456!',
    username: 'test_user_secondary',
  },
  admin: {
    email: 'test-admin@pythoughts-test.com',
    password: 'AdminPassword789!',
    username: 'test_admin',
  },
};

// Test data templates
export const TEST_POST_DATA = {
  title: 'Test Blog Post',
  content: '# Test Content\n\nThis is a test blog post with some content.',
  post_type: 'blog' as const,
  image_url: 'https://via.placeholder.com/600x400',
  category: 'Technology',
  is_published: true,
  is_draft: false,
  subtitle: 'A subtitle for testing',
  seo_title: 'SEO Test Title',
  seo_description: 'SEO description for testing',
};

export const TEST_COMMENT_DATA = {
  content: 'This is a test comment with meaningful content.',
  depth: 0,
};

// Supabase clients
let testClient: SupabaseClient;
let serviceRoleClient: SupabaseClient;

// Track created resources for cleanup
const createdResources = {
  userIds: [] as string[],
  postIds: [] as string[],
  commentIds: [] as string[],
  profileIds: [] as string[],
};

/**
 * Get or create the regular test client (uses anon key)
 */
export function getTestClient(): SupabaseClient {
  if (!testClient) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.test'
      );
    }

    testClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return testClient;
}

/**
 * Get or create the service role client (uses service role key for admin operations)
 * WARNING: Only use in tests! Service role bypasses RLS policies.
 */
export function getServiceRoleClient(): SupabaseClient {
  if (!serviceRoleClient) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Missing Supabase service role credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.test'
      );
    }

    serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serviceRoleClient;
}

/**
 * Create a test user and return the user ID
 */
export async function createTestUser(
  email: string,
  password: string,
  username: string
): Promise<{ userId: string; client: SupabaseClient }> {
  const client = getServiceRoleClient();

  // Create auth user
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  const userId = authData.user.id;
  createdResources.userIds.push(userId);

  // Create profile
  const { error: profileError } = await client.from('profiles').insert({
    id: userId,
    username,
    avatar_url: 'https://via.placeholder.com/150',
    bio: `Test user ${username}`,
    is_admin: username.includes('admin'),
  });

  if (profileError) {
    throw new Error(`Failed to create test profile: ${profileError.message}`);
  }

  createdResources.profileIds.push(userId);

  return { userId, client };
}

/**
 * Sign in as a test user and return authenticated client
 */
export async function signInTestUser(
  email: string,
  password: string
): Promise<{ client: SupabaseClient; userId: string }> {
  const client = getTestClient();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(`Failed to sign in test user: ${error?.message}`);
  }

  return { client, userId: data.user.id };
}

/**
 * Create a test blog post
 */
export async function createTestPost(
  authorId: string,
  overrides: Partial<typeof TEST_POST_DATA> = {}
): Promise<string> {
  const client = getServiceRoleClient();

  const postData = {
    ...TEST_POST_DATA,
    ...overrides,
    author_id: authorId,
  };

  const { data, error } = await client
    .from('posts')
    .insert(postData)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test post: ${error?.message}`);
  }

  createdResources.postIds.push(data.id);
  return data.id;
}

/**
 * Create a test comment
 */
export async function createTestComment(
  postId: string,
  authorId: string,
  overrides: Partial<typeof TEST_COMMENT_DATA> = {}
): Promise<string> {
  const client = getServiceRoleClient();

  const commentData = {
    ...TEST_COMMENT_DATA,
    ...overrides,
    post_id: postId,
    author_id: authorId,
  };

  const { data, error } = await client
    .from('comments')
    .insert(commentData)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test comment: ${error?.message}`);
  }

  createdResources.commentIds.push(data.id);
  return data.id;
}

/**
 * Clean up all created test resources
 */
export async function cleanupTestData(): Promise<void> {
  const client = getServiceRoleClient();

  try {
    // Delete in reverse dependency order

    // Delete comments
    if (createdResources.commentIds.length > 0) {
      await client
        .from('comments')
        .delete()
        .in('id', createdResources.commentIds);
      createdResources.commentIds = [];
    }

    // Delete posts
    if (createdResources.postIds.length > 0) {
      await client
        .from('posts')
        .delete()
        .in('id', createdResources.postIds);
      createdResources.postIds = [];
    }

    // Delete profiles
    if (createdResources.profileIds.length > 0) {
      await client
        .from('profiles')
        .delete()
        .in('id', createdResources.profileIds);
      createdResources.profileIds = [];
    }

    // Delete auth users
    if (createdResources.userIds.length > 0) {
      for (const userId of createdResources.userIds) {
        await client.auth.admin.deleteUser(userId);
      }
      createdResources.userIds = [];
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    // Don't throw - we want tests to continue even if cleanup fails
  }
}

/**
 * Wait for async operations (useful for database triggers)
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique email for tests to avoid conflicts
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@pythoughts-test.com`;
}

/**
 * Generate a unique username for tests
 */
export function generateTestUsername(prefix: string = 'user'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}_${timestamp}_${random}`;
}

// Global setup - runs once before all tests
beforeAll(async () => {
  // Verify environment variables
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing required environment variables for integration tests. Please create .env.test file.'
    );
  }

  // Initialize clients
  getTestClient();

  // Only initialize service role if available (for read-only tests)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    getServiceRoleClient();
  }
});

// Global cleanup - runs once after all tests
afterAll(async () => {
  await cleanupTestData();

  // Sign out all clients
  if (testClient) {
    await testClient.auth.signOut();
  }
});

// Per-test cleanup - runs after each test
afterEach(async () => {
  // Sign out the test client after each test
  if (testClient) {
    await testClient.auth.signOut();
  }
});
