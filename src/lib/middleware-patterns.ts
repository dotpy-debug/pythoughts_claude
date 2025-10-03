/**
 * Error Handling Middleware Patterns
 *
 * This file demonstrates middleware patterns for error handling that can be used
 * in API routes, server actions, and other request handlers.
 *
 * @module middleware-patterns
 */

import {
  AppError,
  AuthError,
  ValidationError,
  RateLimitError,
  ErrorLogger,
  handleError,
  toSuccessResponse,
  type ErrorResponse,
  type SuccessResponse,
} from './errors';
import { logger } from './logger';
import { supabase } from './supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Request context passed to handlers
 */
export interface RequestContext {
  userId?: string;
  requestId: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Handler function type
 */
export type Handler<TInput, TOutput> = (
  input: TInput,
  context: RequestContext
) => Promise<TOutput>;

/**
 * Middleware function type
 */
export type Middleware<TInput> = (
  input: TInput,
  context: RequestContext
) => Promise<void>;

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Authentication middleware - verifies user session
 */
export const withAuth: Middleware<any> = async (_input, context) => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new AuthError('Authentication required');
  }

  // Add userId to context
  context.userId = session.user.id;
};

/**
 * Rate limiting middleware - checks request rate limits
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const createRateLimitMiddleware = (
  maxRequests: number = 100,
  windowMs: number = 60000
): Middleware<any> => {
  return async (_input, context) => {
    const key = context.userId || context.ip || 'anonymous';
    const now = Date.now();

    const userLimit = rateLimitStore.get(key);

    if (!userLimit || now > userLimit.resetAt) {
      rateLimitStore.set(key, {
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
  };
};

/**
 * Request logging middleware - logs all requests
 */
export const withRequestLogging: Middleware<any> = async (_input, context) => {
  logger.info('Request received', {
    requestId: context.requestId,
    userId: context.userId,
    timestamp: context.timestamp,
  });
};

/**
 * Input validation middleware factory
 */
export const createValidationMiddleware = <TInput>(
  validator: (input: TInput) => void | Promise<void>
): Middleware<TInput> => {
  return async (input, _context) => {
    try {
      await validator(input);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid input');
    }
  };
};

// ============================================================================
// MIDDLEWARE COMPOSER
// ============================================================================

/**
 * Composes multiple middleware functions
 */
export function composeMiddleware<TInput>(
  ...middlewares: Middleware<TInput>[]
): Middleware<TInput> {
  return async (input, context) => {
    for (const middleware of middlewares) {
      await middleware(input, context);
    }
  };
}

// ============================================================================
// HANDLER WRAPPER
// ============================================================================

/**
 * Wraps a handler with middleware and error handling
 */
export function createHandler<TInput, TOutput>(
  handler: Handler<TInput, TOutput>,
  options: {
    middleware?: Middleware<TInput>[];
    name?: string;
    logSuccess?: boolean;
  } = {}
): (input: TInput) => Promise<SuccessResponse<TOutput> | ErrorResponse> {
  const {
    middleware = [],
    name = 'handler',
    logSuccess = true,
  } = options;

  return async (input: TInput) => {
    const context: RequestContext = {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    try {
      // Run middleware
      for (const mw of middleware) {
        await mw(input, context);
      }

      // Execute handler
      const result = await logger.measureTime(
        name,
        () => handler(input, context),
        { requestId: context.requestId, userId: context.userId }
      );

      // Log success
      if (logSuccess) {
        logger.info(`${name} succeeded`, {
          requestId: context.requestId,
          userId: context.userId,
        });
      }

      return toSuccessResponse(result, {
        requestId: context.requestId,
      });
    } catch (error) {
      ErrorLogger.log(error as Error, name, {
        requestId: context.requestId,
        userId: context.userId,
      });

      return handleError(error, name);
    }
  };
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Simple handler with error handling
 */
export const getPosts = createHandler(
  async (input: { limit: number }, _context) => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .limit(input.limit);

    if (error) {
      throw new AppError('Failed to fetch posts');
    }

    return data;
  },
  {
    name: 'getPosts',
  }
);

/**
 * Example: Handler with authentication middleware
 */
export const createPost = createHandler(
  async (
    input: { title: string; content: string },
    context
  ) => {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: input.title,
        content: input.content,
        author_id: context.userId!,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to create post');
    }

    return data;
  },
  {
    name: 'createPost',
    middleware: [withAuth],
  }
);

/**
 * Example: Handler with multiple middleware
 */
export const updatePost = createHandler(
  async (
    input: { postId: string; title?: string; content?: string },
    context
  ) => {
    // Verify ownership
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', input.postId)
      .single();

    if (fetchError || !post) {
      throw new AppError('Post not found', 404);
    }

    if (post.author_id !== context.userId) {
      throw new AuthError('Not authorized', 403);
    }

    // Update post
    const { data, error } = await supabase
      .from('posts')
      .update({
        title: input.title,
        content: input.content,
      })
      .eq('id', input.postId)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update post');
    }

    return data;
  },
  {
    name: 'updatePost',
    middleware: [
      withAuth,
      withRequestLogging,
      createRateLimitMiddleware(20, 60000),
    ],
  }
);

/**
 * Example: Handler with validation middleware
 */
const validateCreatePostInput = (input: { title: string; content: string }) => {
  const errors: Record<string, string[]> = {};

  if (!input.title || input.title.trim().length === 0) {
    errors.title = ['Title is required'];
  } else if (input.title.length > 200) {
    errors.title = ['Title must be less than 200 characters'];
  }

  if (!input.content || input.content.trim().length === 0) {
    errors.content = ['Content is required'];
  } else if (input.content.length < 10) {
    errors.content = ['Content must be at least 10 characters'];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
};

export const createPostWithValidation = createHandler(
  async (
    input: { title: string; content: string },
    context
  ) => {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: input.title,
        content: input.content,
        author_id: context.userId!,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to create post');
    }

    return data;
  },
  {
    name: 'createPostWithValidation',
    middleware: [
      withAuth,
      createValidationMiddleware(validateCreatePostInput),
      createRateLimitMiddleware(10, 60000),
    ],
  }
);

// ============================================================================
// BATCH OPERATIONS WITH ERROR HANDLING
// ============================================================================

/**
 * Executes multiple operations and collects results/errors
 */
export async function executeBatch<T>(
  operations: Array<() => Promise<T>>,
  options: {
    stopOnError?: boolean;
    maxConcurrency?: number;
  } = {}
): Promise<{
  results: T[];
  errors: Error[];
  successful: number;
  failed: number;
}> {
  const { stopOnError = false, maxConcurrency = 5 } = options;
  const results: T[] = [];
  const errors: Error[] = [];

  // Simple concurrency control
  const chunks: Array<Array<() => Promise<T>>> = [];
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    chunks.push(operations.slice(i, i + maxConcurrency));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (op, _index) => {
      try {
        const result = await op();
        results.push(result);
      } catch (error) {
        errors.push(error as Error);
        if (stopOnError) {
          throw error;
        }
      }
    });

    if (stopOnError) {
      await Promise.all(promises);
    } else {
      await Promise.allSettled(promises);
    }
  }

  return {
    results,
    errors,
    successful: results.length,
    failed: errors.length,
  };
}

/**
 * Example: Batch delete posts with error handling
 */
export async function batchDeletePosts(
  postIds: string[],
  userId: string
): Promise<{
  deleted: string[];
  failed: Array<{ postId: string; error: string }>;
}> {
  const deleted: string[] = [];
  const failed: Array<{ postId: string; error: string }> = [];

  const operations = postIds.map((postId) => async () => {
    // Verify ownership
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      throw new AppError(`Post ${postId} not found`);
    }

    if (post.author_id !== userId) {
      throw new AuthError(`Not authorized to delete post ${postId}`);
    }

    // Delete post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      throw new AppError(`Failed to delete post ${postId}`);
    }

    deleted.push(postId);
  });

  const result = await executeBatch(operations, {
    stopOnError: false,
    maxConcurrency: 3,
  });

  // Map errors to failed posts
  result.errors.forEach((error, index) => {
    const postId = postIds[index];
    failed.push({
      postId,
      error: error.message,
    });
  });

  logger.info('Batch delete completed', {
    total: postIds.length,
    deleted: deleted.length,
    failed: failed.length,
  });

  return { deleted, failed };
}

// ============================================================================
// TRANSACTION-LIKE OPERATIONS
// ============================================================================

/**
 * Executes operations in sequence and rolls back on error
 */
export async function executeTransaction<T>(
  operations: Array<{
    execute: () => Promise<T>;
    rollback: () => Promise<void>;
  }>
): Promise<T[]> {
  const results: T[] = [];
  const executedOps: number[] = [];

  try {
    for (let i = 0; i < operations.length; i++) {
      const result = await operations[i].execute();
      results.push(result);
      executedOps.push(i);
    }

    return results;
  } catch (error) {
    // Rollback in reverse order
    logger.warn('Transaction failed, rolling back', {
      executedOps: executedOps.length,
      totalOps: operations.length,
    });

    for (let i = executedOps.length - 1; i >= 0; i--) {
      const opIndex = executedOps[i];
      try {
        await operations[opIndex].rollback();
      } catch (rollbackError) {
        logger.error('Rollback failed', rollbackError as Error, {
          operation: opIndex,
        });
      }
    }

    throw error;
  }
}

/**
 * Example: Create post with related records (transactional)
 */
export async function createPostWithTags(
  title: string,
  content: string,
  tags: string[],
  userId: string
): Promise<any> {
  let postId: string | null = null;
  let tagIds: string[] = [];

  return executeTransaction([
    {
      execute: async () => {
        const { data, error } = await supabase
          .from('posts')
          .insert({ title, content, author_id: userId })
          .select()
          .single();

        if (error) throw new AppError('Failed to create post');
        postId = data.id;
        return data;
      },
      rollback: async () => {
        if (postId) {
          await supabase.from('posts').delete().eq('id', postId);
        }
      },
    },
    {
      execute: async () => {
        const tagInserts = tags.map((tag) => ({
          post_id: postId,
          tag_name: tag,
        }));

        const { data, error } = await supabase
          .from('post_tags')
          .insert(tagInserts)
          .select();

        if (error) throw new AppError('Failed to create tags');
        tagIds = data.map((t: any) => t.id);
        return data;
      },
      rollback: async () => {
        if (tagIds.length > 0) {
          await supabase.from('post_tags').delete().in('id', tagIds);
        }
      },
    },
  ]);
}
