/**
 * Error Handling Usage Examples
 *
 * This file demonstrates how to use the centralized error handling system
 * in the Pythoughts platform.
 *
 * @module error-handling-examples
 */

import {
  AuthError,
  DatabaseError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  RateLimitError,
  ExternalServiceError,
  ConflictError,
  ErrorLogger,
  withErrorHandling,
  withErrorBoundary,
  withRetry,
  isRetryableError,
  toSuccessResponse,
  handleError,
  createErrorHandler,
  type ErrorResponse,
  type SuccessResponse,
} from './errors';
import { logger } from './logger';
import { supabase } from './supabase';

// ============================================================================
// EXAMPLE 1: Using Custom Error Classes
// ============================================================================

/**
 * Example: Authentication error
 */
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AuthError('Invalid email or password');
  }

  if (!data.user) {
    throw new AuthError('User not found', 404);
  }

  return data.user;
}

/**
 * Example: Validation error with field-specific messages
 */
export function validateCreatePost(title: string, content: string) {
  const errors: Record<string, string[]> = {};

  if (!title || title.trim().length === 0) {
    errors.title = ['Title is required'];
  } else if (title.length > 200) {
    errors.title = ['Title must be less than 200 characters'];
  }

  if (!content || content.trim().length === 0) {
    errors.content = ['Content is required'];
  } else if (content.length < 10) {
    errors.content = ['Content must be at least 10 characters'];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}

/**
 * Example: Database error with metadata
 */
export async function getPostById(postId: string) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      throw new DatabaseError('Failed to fetch post', {
        table: 'posts',
        query: 'select-by-id',
      });
    }

    if (!data) {
      throw new NotFoundError(
        'Post not found',
        'post',
        postId
      );
    }

    return data;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError('Unexpected database error');
  }
}

/**
 * Example: Permission/authorization error
 */
export async function deletePost(postId: string, userId: string) {
  const post = await getPostById(postId);

  if (post.author_id !== userId) {
    throw new ForbiddenError(
      'You do not have permission to delete this post',
      'delete',
      'post'
    );
  }

  // Proceed with deletion
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    throw new DatabaseError('Failed to delete post');
  }
}

/**
 * Example: Conflict error (duplicate resource)
 */
export async function createUsername(userId: string, username: string) {
  // Check if username already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .single();

  if (existing) {
    throw new ConflictError(
      'Username already taken',
      'username'
    );
  }

  // Create username
  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId);

  if (error) {
    throw new DatabaseError('Failed to update username');
  }
}

// ============================================================================
// EXAMPLE 2: Using Error Handling Wrappers
// ============================================================================

/**
 * Example: Using withErrorHandling for async operations
 */
export async function fetchUserPosts(userId: string) {
  return withErrorHandling(
    async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseError('Failed to fetch user posts');
      }

      return data;
    },
    'fetchUserPosts',
    {
      onError: (error) => {
        // Custom error handling logic
        logger.error('Failed to fetch user posts', { userId, error });
      },
      rethrow: true,
    }
  );
}

/**
 * Example: Using withErrorBoundary to wrap a function
 */
export const fetchUserProfile = withErrorBoundary(
  async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new DatabaseError('Failed to fetch user profile');
    }

    if (!data) {
      throw new NotFoundError('User profile not found', 'profile', userId);
    }

    return data;
  },
  'fetchUserProfile'
);

// ============================================================================
// EXAMPLE 3: Using Retry Logic
// ============================================================================

/**
 * Example: Retrying an external API call
 */
export async function sendVerificationEmail(email: string) {
  return withRetry(
    async () => {
      // Simulate external API call
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new ExternalServiceError(
          'Email',
          'Failed to send verification email'
        );
      }

      return response.json();
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      shouldRetry: (error) => isRetryableError(error),
      onRetry: (error, attempt, delay) => {
        logger.warn('Retrying email send', {
          email,
          attempt,
          delay,
          errorMessage: error.message,
        });
      },
    }
  );
}

// ============================================================================
// EXAMPLE 4: API Response Formatting
// ============================================================================

/**
 * Example: Creating a standardized success response
 */
export function createPostResponse(post: any): SuccessResponse {
  return toSuccessResponse(post, {
    action: 'create_post',
    requestId: crypto.randomUUID(),
  });
}

/**
 * Example: Handling errors in an API route
 */
export async function apiCreatePost(
  title: string,
  content: string,
  userId: string
): Promise<SuccessResponse | ErrorResponse> {
  try {
    // Validate input
    validateCreatePost(title, content);

    // Create post
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        author_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create post');
    }

    return toSuccessResponse(data, {
      action: 'create_post',
    });
  } catch (error) {
    return handleError(error, 'apiCreatePost');
  }
}

/**
 * Example: Using createErrorHandler for consistent error handling
 */
export const postErrorHandler = createErrorHandler('post-operations');

export async function apiUpdatePost(
  postId: string,
  updates: { title?: string; content?: string },
  userId: string
): Promise<SuccessResponse | ErrorResponse> {
  try {
    // Verify ownership
    const post = await getPostById(postId);
    if (post.author_id !== userId) {
      throw new ForbiddenError(
        'You do not have permission to update this post',
        'update',
        'post'
      );
    }

    // Update post
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to update post');
    }

    return toSuccessResponse(data, {
      action: 'update_post',
    });
  } catch (error) {
    return postErrorHandler(error);
  }
}

// ============================================================================
// EXAMPLE 5: Error Logging
// ============================================================================

/**
 * Example: Manual error logging with context
 */
export async function complexOperation(userId: string) {
  try {
    // Some complex operation
    const result = await performComplexTask(userId);
    return result;
  } catch (error) {
    if (error instanceof DatabaseError) {
      ErrorLogger.logDatabase(error, 'complexOperation', {
        userId,
        timestamp: new Date().toISOString(),
      });
    } else if (error instanceof ExternalServiceError) {
      ErrorLogger.logExternalService(error, 'complexOperation', {
        userId,
      });
    } else {
      ErrorLogger.log(error as Error, 'complexOperation', {
        userId,
      });
    }

    throw error;
  }
}

async function performComplexTask(userId: string): Promise<any> {
  // Placeholder for complex task
  return { userId };
}

// ============================================================================
// EXAMPLE 6: Rate Limiting
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Example: Rate limiting with proper error handling
 */
export function checkRateLimit(userId: string, maxRequests: number = 100) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Reset the rate limit
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (userLimit.count >= maxRequests) {
    const retryAfter = Math.ceil((userLimit.resetAt - now) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter
    );
  }

  userLimit.count++;
}

/**
 * Example: Using rate limiting in an API endpoint
 */
export async function apiGetUserPosts(
  userId: string
): Promise<SuccessResponse | ErrorResponse> {
  try {
    // Check rate limit
    checkRateLimit(userId);

    // Fetch posts
    const posts = await fetchUserPosts(userId);

    return toSuccessResponse(posts);
  } catch (error) {
    return handleError(error, 'apiGetUserPosts');
  }
}

// ============================================================================
// EXAMPLE 7: Typed Error Responses in React Components
// ============================================================================

/**
 * Example: Using error responses in React components
 */
export async function handleFormSubmit(
  formData: { title: string; content: string },
  userId: string
): Promise<{ success: boolean; data?: any; error?: string; fields?: Record<string, string[]> }> {
  try {
    const response = await apiCreatePost(
      formData.title,
      formData.content,
      userId
    );

    if (!response.success) {
      // Handle error response
      return {
        success: false,
        error: response.error.message,
        fields: response.error.fields,
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// ============================================================================
// EXAMPLE 8: Chaining Multiple Operations with Error Handling
// ============================================================================

/**
 * Example: Complex operation with multiple steps and error handling
 */
export async function createPostWithNotifications(
  title: string,
  content: string,
  userId: string
): Promise<SuccessResponse | ErrorResponse> {
  try {
    // Step 1: Validate input
    validateCreatePost(title, content);

    // Step 2: Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        author_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postError) {
      throw new DatabaseError('Failed to create post', {
        table: 'posts',
        query: 'insert',
      });
    }

    // Step 3: Send notifications (non-critical, log but don't fail)
    try {
      await sendPostNotifications(post.id, userId);
    } catch (error) {
      logger.warn('Failed to send post notifications', {
        postId: post.id,
        error: error instanceof Error ? error : undefined,
      });
      // Don't throw - notifications are not critical
    }

    // Step 4: Invalidate cache
    try {
      // Cache invalidation logic
      await invalidatePostCache(userId);
    } catch (error) {
      logger.warn('Failed to invalidate cache', {
        userId,
        error: error instanceof Error ? error : undefined,
      });
      // Don't throw - cache invalidation is not critical
    }

    return toSuccessResponse(post, {
      action: 'create_post_with_notifications',
    });
  } catch (error) {
    return handleError(error, 'createPostWithNotifications');
  }
}

async function sendPostNotifications(postId: string, userId: string): Promise<void> {
  // Placeholder for notification logic
  logger.info('Sending post notifications', { postId, userId });
}

async function invalidatePostCache(userId: string): Promise<void> {
  // Placeholder for cache invalidation
  logger.info('Invalidating post cache', { userId });
}
