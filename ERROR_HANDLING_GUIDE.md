# Error Handling Guide

This guide explains how to use the centralized error handling system in the Pythoughts platform.

## Table of Contents

1. [Overview](#overview)
2. [Environment Validation](#environment-validation)
3. [Error Classes](#error-classes)
4. [Logging System](#logging-system)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [API Response Format](#api-response-format)

## Overview

The Pythoughts platform uses a centralized error handling system that provides:

- **Type-safe environment variable validation** with helpful error messages
- **Custom error classes** for different error types
- **Structured logging** with different log levels
- **Consistent error response formatting** for APIs
- **Retry logic** with exponential backoff
- **Error boundaries** for catching and handling errors

## Environment Validation

### File: `src/lib/env.ts`

Environment variables are validated on application startup. Missing or invalid variables will cause the application to fail fast with clear error messages.

### Required Variables

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Production-Only Required Variables

- `VITE_BETTER_AUTH_URL` - Better Auth URL
- `VITE_BETTER_AUTH_SECRET` - Better Auth secret
- `VITE_RESEND_API_KEY` - Resend API key (must start with "re_")

### Optional Variables

- `VITE_REDIS_URL` - Redis URL (defaults to `redis://localhost:6379`)
- `VITE_ENABLE_ANALYTICS` - Enable analytics tracking
- `VITE_ENABLE_DEBUG` - Enable debug mode

### Usage

```typescript
import { env, isProduction, isDevelopment, isDebugEnabled } from './lib/env';

// Access validated environment variables
const supabaseUrl = env.VITE_SUPABASE_URL;
const redisUrl = env.VITE_REDIS_URL;

// Check environment
if (isProduction()) {
  // Production-specific logic
}

if (isDebugEnabled()) {
  // Debug logging
}
```

## Error Classes

### File: `src/lib/errors.ts`

The platform provides several custom error classes for different scenarios:

### 1. `AppError` (Base Class)

Base class for all application errors.

```typescript
import { AppError } from './lib/errors';

throw new AppError('Something went wrong', 500);
```

### 2. `AuthError`

Authentication and session errors.

```typescript
import { AuthError } from './lib/errors';

throw new AuthError('Invalid credentials', 401);
throw new AuthError('Session expired', 401);
```

### 3. `DatabaseError`

Database operation errors.

```typescript
import { DatabaseError } from './lib/errors';

throw new DatabaseError('Failed to fetch posts', {
  table: 'posts',
  query: 'select-all',
});
```

### 4. `ValidationError`

Input validation errors with field-specific messages.

```typescript
import { ValidationError } from './lib/errors';

throw new ValidationError('Validation failed', {
  email: ['Email is required', 'Email must be valid'],
  password: ['Password must be at least 8 characters'],
});
```

### 5. `NotFoundError`

Resource not found errors.

```typescript
import { NotFoundError } from './lib/errors';

throw new NotFoundError('Post not found', 'post', postId);
```

### 6. `ForbiddenError`

Permission/authorization errors.

```typescript
import { ForbiddenError } from './lib/errors';

throw new ForbiddenError(
  'You do not have permission to delete this post',
  'delete',
  'post'
);
```

### 7. `RateLimitError`

Rate limiting errors.

```typescript
import { RateLimitError } from './lib/errors';

throw new RateLimitError('Rate limit exceeded', 60); // retry after 60 seconds
```

### 8. `ExternalServiceError`

External service errors (Supabase, Redis, Resend, etc.).

```typescript
import { ExternalServiceError } from './lib/errors';

throw new ExternalServiceError('Supabase', 'Connection failed', originalError);
```

### 9. `ConflictError`

Resource conflict errors (e.g., duplicate username).

```typescript
import { ConflictError } from './lib/errors';

throw new ConflictError('Username already taken', 'username');
```

## Logging System

### File: `src/lib/logger.ts`

The logging system provides structured logging with different log levels.

### Log Levels

- `DEBUG` - Detailed information for debugging
- `INFO` - General informational messages
- `WARN` - Warning messages for potentially harmful situations
- `ERROR` - Error messages for failures
- `FATAL` - Critical errors that may cause application shutdown

### Basic Usage

```typescript
import { logger } from './lib/logger';

logger.debug('Debug message', { userId: '123' });
logger.info('User logged in', { userId: '123', timestamp: Date.now() });
logger.warn('API rate limit approaching', { requests: 95, limit: 100 });
logger.error('Failed to fetch posts', { error: err, userId: '123' });
logger.fatal('Database connection failed', { error: err });
```

### Logging with Errors

```typescript
import { logger } from './lib/logger';

try {
  // Some operation
} catch (error) {
  logger.error('Operation failed', error as Error, {
    userId: '123',
    operation: 'createPost',
  });
}
```

### Child Loggers

Create child loggers with additional context:

```typescript
import { logger } from './lib/logger';

const postLogger = logger.child('post-operations');
postLogger.info('Creating post'); // Logs with context: "post-operations"

const userLogger = logger.child({ userId: '123', module: 'user' });
userLogger.info('Updating profile'); // Logs with userId and module metadata
```

### Performance Measurement

```typescript
import { logger } from './lib/logger';

const result = await logger.measureTime(
  'fetchUserPosts',
  async () => {
    return await supabase.from('posts').select('*');
  },
  { userId: '123' }
);
// Logs execution time automatically
```

### Custom Logger Configuration

```typescript
import { createLogger, LogLevel } from './lib/logger';

const customLogger = createLogger({
  minLevel: LogLevel.WARN, // Only log warnings and above
  prettyPrint: false, // Use structured JSON format
  includeTimestamp: true,
  includeContext: true,
});
```

## Usage Examples

### Example 1: API Route with Error Handling

```typescript
import {
  ValidationError,
  DatabaseError,
  toSuccessResponse,
  handleError,
} from './lib/errors';
import { logger } from './lib/logger';
import { supabase } from './lib/supabase';

export async function createPost(title: string, content: string, userId: string) {
  try {
    // Validate input
    if (!title || title.trim().length === 0) {
      throw new ValidationError('Validation failed', {
        title: ['Title is required'],
      });
    }

    // Create post
    const { data, error } = await supabase
      .from('posts')
      .insert({ title, content, author_id: userId })
      .select()
      .single();

    if (error) {
      throw new DatabaseError('Failed to create post');
    }

    logger.info('Post created successfully', { postId: data.id, userId });

    return toSuccessResponse(data);
  } catch (error) {
    return handleError(error, 'createPost');
  }
}
```

### Example 2: Using Error Wrappers

```typescript
import { withErrorHandling, withErrorBoundary } from './lib/errors';
import { logger } from './lib/logger';

// Wrap an async operation
const posts = await withErrorHandling(
  async () => {
    const { data, error } = await supabase.from('posts').select('*');
    if (error) throw new DatabaseError('Failed to fetch posts');
    return data;
  },
  'fetchPosts',
  {
    onError: (error) => logger.error('Failed to fetch posts', error),
    rethrow: true,
  }
);

// Wrap a function
const fetchUserProfile = withErrorBoundary(
  async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new DatabaseError('Failed to fetch profile');
    return data;
  },
  'fetchUserProfile'
);
```

### Example 3: Retry Logic

```typescript
import { withRetry, isRetryableError } from './lib/errors';
import { logger } from './lib/logger';

const result = await withRetry(
  async () => {
    const response = await fetch('/api/external-service');
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    shouldRetry: (error) => isRetryableError(error),
    onRetry: (error, attempt, delay) => {
      logger.warn('Retrying API request', { attempt, delay, error: error.message });
    },
  }
);
```

### Example 4: React Component with Error Handling

```typescript
import { useState } from 'react';
import { createPost } from './api/posts';
import { logger } from './lib/logger';

function CreatePostForm() {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    const response = await createPost(title, content, userId);

    if (!response.success) {
      if (response.error.fields) {
        setErrors(response.error.fields);
      } else {
        setError(response.error.message);
      }
      return;
    }

    // Handle success
    logger.info('Post created', { postId: response.data.id });
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <input name="title" />
      {errors.title && <div className="error">{errors.title.join(', ')}</div>}

      <textarea name="content" />
      {errors.content && <div className="error">{errors.content.join(', ')}</div>}

      <button type="submit">Create Post</button>
    </form>
  );
}
```

## Best Practices

### 1. Use Specific Error Classes

Use the most specific error class for each scenario:

```typescript
// Good
throw new ValidationError('Invalid email', { email: ['Email must be valid'] });
throw new NotFoundError('Post not found', 'post', postId);

// Bad
throw new Error('Invalid email');
throw new Error('Post not found');
```

### 2. Include Context in Errors

Provide helpful context to make debugging easier:

```typescript
// Good
throw new DatabaseError('Failed to update user profile', {
  table: 'profiles',
  query: 'update-by-id',
});

// Bad
throw new DatabaseError('Database error');
```

### 3. Log Before Throwing

Log errors before throwing them to capture the full context:

```typescript
// Good
try {
  const result = await complexOperation();
} catch (error) {
  logger.error('Complex operation failed', error as Error, { userId, step: 2 });
  throw error;
}

// Also good - use ErrorLogger
catch (error) {
  ErrorLogger.log(error as Error, 'complexOperation', { userId });
  throw error;
}
```

### 4. Handle Non-Critical Errors Gracefully

Don't fail the entire operation for non-critical errors:

```typescript
try {
  // Critical operation
  const post = await createPost(title, content, userId);

  // Non-critical operation - log but don't throw
  try {
    await sendNotifications(post.id);
  } catch (error) {
    logger.warn('Failed to send notifications', { postId: post.id, error });
  }

  return post;
} catch (error) {
  throw error; // Only throw for critical errors
}
```

### 5. Use Retry Logic for Transient Errors

Use retry logic for operations that might fail temporarily:

```typescript
const result = await withRetry(
  () => redisClient.get(key),
  {
    maxRetries: 3,
    shouldRetry: (error) => isRetryableError(error),
  }
);
```

### 6. Return Typed Responses

Always return typed success or error responses from APIs:

```typescript
// Good
export async function apiCreatePost(
  data: CreatePostInput
): Promise<SuccessResponse<Post> | ErrorResponse> {
  try {
    const post = await createPost(data);
    return toSuccessResponse(post);
  } catch (error) {
    return handleError(error, 'apiCreatePost');
  }
}

// Bad
export async function apiCreatePost(data: CreatePostInput): Promise<any> {
  // No type safety
}
```

## API Response Format

### Success Response

```typescript
{
  success: true,
  data: {
    // Your data here
  },
  metadata: {
    timestamp: "2025-10-03T12:00:00.000Z",
    requestId: "uuid-here",
    // Additional metadata
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    name: "ValidationError",
    message: "Validation failed",
    statusCode: 400,
    timestamp: "2025-10-03T12:00:00.000Z",
    fields: {
      email: ["Email is required", "Email must be valid"],
      password: ["Password must be at least 8 characters"]
    }
  }
}
```

### Error Response with Metadata

```typescript
{
  success: false,
  error: {
    name: "NotFoundError",
    message: "Post not found",
    statusCode: 404,
    timestamp: "2025-10-03T12:00:00.000Z",
    metadata: {
      resource: "post",
      resourceId: "123"
    }
  }
}
```

## Testing Error Handling

### Example: Testing Error Scenarios

```typescript
import { describe, it, expect } from 'vitest';
import { ValidationError, NotFoundError } from './lib/errors';
import { validateCreatePost, getPostById } from './api/posts';

describe('Post Validation', () => {
  it('should throw ValidationError for empty title', () => {
    expect(() => validateCreatePost('', 'content')).toThrow(ValidationError);
  });

  it('should throw ValidationError with field errors', () => {
    try {
      validateCreatePost('', '');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fields).toHaveProperty('title');
      expect((error as ValidationError).fields).toHaveProperty('content');
    }
  });
});

describe('Post Retrieval', () => {
  it('should throw NotFoundError for non-existent post', async () => {
    await expect(getPostById('non-existent-id')).rejects.toThrow(NotFoundError);
  });
});
```

## Migration Guide

If you're migrating from the old error handling approach:

### Before

```typescript
try {
  const { data, error } = await supabase.from('posts').select('*');
  if (error) {
    console.error('Error:', error);
    throw new Error('Failed to fetch posts');
  }
} catch (error) {
  console.error(error);
}
```

### After

```typescript
import { DatabaseError, ErrorLogger } from './lib/errors';
import { logger } from './lib/logger';

try {
  const { data, error } = await supabase.from('posts').select('*');
  if (error) {
    throw new DatabaseError('Failed to fetch posts', { table: 'posts' });
  }
} catch (error) {
  ErrorLogger.log(error as Error, 'fetchPosts');
  throw error;
}
```

## Additional Resources

- See `src/lib/error-handling-examples.ts` for comprehensive usage examples
- See `src/lib/env.ts` for environment validation details
- See `src/lib/errors.ts` for all available error classes
- See `src/lib/logger.ts` for logging utilities
