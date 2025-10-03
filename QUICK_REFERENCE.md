# Error Handling Quick Reference

## Import Statements

```typescript
// Environment
import { env, isProduction, isDevelopment, isDebugEnabled } from './lib/env';

// Logging
import { logger } from './lib/logger';

// Error Classes
import {
  AppError,
  AuthError,
  DatabaseError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  RateLimitError,
  ExternalServiceError,
  ConflictError,
} from './lib/errors';

// Error Utilities
import {
  ErrorLogger,
  withErrorHandling,
  withErrorBoundary,
  withRetry,
  handleError,
  toSuccessResponse,
  toErrorResponse,
  isRetryableError,
} from './lib/errors';

// Middleware
import {
  createHandler,
  withAuth,
  createRateLimitMiddleware,
  createValidationMiddleware,
} from './lib/middleware-patterns';
```

## Common Patterns

### 1. Basic API Handler

```typescript
export async function createPost(title: string, content: string, userId: string) {
  try {
    // Validation
    if (!title) {
      throw new ValidationError('Title is required', { title: ['Required'] });
    }

    // Database operation
    const { data, error } = await supabase.from('posts').insert({ title, content, author_id: userId });

    if (error) {
      throw new DatabaseError('Failed to create post');
    }

    // Log success
    logger.info('Post created', { postId: data.id });

    return toSuccessResponse(data);
  } catch (error) {
    return handleError(error, 'createPost');
  }
}
```

### 2. Handler with Middleware

```typescript
export const createPost = createHandler(
  async (input: { title: string; content: string }, context) => {
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...input, author_id: context.userId });

    if (error) throw new DatabaseError('Failed to create post');
    return data;
  },
  {
    name: 'createPost',
    middleware: [withAuth, createRateLimitMiddleware(10, 60000)],
  }
);
```

### 3. Retry Logic

```typescript
const result = await withRetry(
  () => fetchExternalAPI(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    shouldRetry: (error) => isRetryableError(error),
  }
);
```

### 4. Logging

```typescript
// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Operation failed', error, { userId: '123' });

// Performance measurement
const result = await logger.measureTime('fetchPosts', async () => {
  return await fetchPosts();
});

// Child logger
const postLogger = logger.child({ context: 'posts' });
postLogger.info('Creating post');
```

### 5. React Component

```typescript
function CreatePostForm() {
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    const response = await createPost(title, content, userId);

    if (!response.success) {
      if (response.error.fields) {
        setErrors(response.error.fields);
      }
      return;
    }

    // Success!
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      {errors.title && <div>{errors.title.join(', ')}</div>}
    </form>
  );
}
```

## Error Classes Reference

| Class | Status Code | Use Case |
|-------|-------------|----------|
| `AuthError` | 401 | Authentication failures |
| `ForbiddenError` | 403 | Authorization failures |
| `NotFoundError` | 404 | Resource not found |
| `ValidationError` | 400 | Input validation errors |
| `ConflictError` | 409 | Resource conflicts |
| `RateLimitError` | 429 | Rate limit exceeded |
| `DatabaseError` | 500 | Database errors |
| `ExternalServiceError` | 503 | External service errors |

## Log Levels

| Level | Method | Use Case |
|-------|--------|----------|
| DEBUG | `logger.debug()` | Detailed debugging info |
| INFO | `logger.info()` | General information |
| WARN | `logger.warn()` | Warning messages |
| ERROR | `logger.error()` | Error messages |
| FATAL | `logger.fatal()` | Critical errors |

## Response Format

### Success

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2025-10-03T12:00:00.000Z"
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2025-10-03T12:00:00.000Z",
    "fields": {
      "email": ["Email is required"]
    }
  }
}
```

## Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | - |
| `VITE_SUPABASE_ANON_KEY` | Yes | - |
| `VITE_REDIS_URL` | No | `redis://localhost:6379` |
| `VITE_BETTER_AUTH_URL` | Prod only | - |
| `VITE_BETTER_AUTH_SECRET` | Prod only | - |
| `VITE_RESEND_API_KEY` | Prod only | - |

## Files Overview

| File | Purpose |
|------|---------|
| `src/lib/env.ts` | Environment validation |
| `src/lib/logger.ts` | Structured logging |
| `src/lib/errors.ts` | Error classes and utilities |
| `src/lib/middleware-patterns.ts` | Middleware helpers |
| `src/lib/error-handling-examples.ts` | Usage examples |
| `ERROR_HANDLING_GUIDE.md` | Full documentation |
| `IMPLEMENTATION_SUMMARY.md` | Implementation overview |
| `.env.example` | Environment template |

## Common Tasks

### Setup Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### Throw Validation Error

```typescript
throw new ValidationError('Validation failed', {
  email: ['Email is required', 'Email must be valid'],
});
```

### Throw Database Error

```typescript
throw new DatabaseError('Failed to create post', {
  table: 'posts',
  query: 'insert',
});
```

### Log with Context

```typescript
logger.info('User action', {
  userId: '123',
  action: 'create_post',
  metadata: { ... },
});
```

### Measure Performance

```typescript
const result = await logger.measureTime('operation', async () => {
  return await performOperation();
});
```

### Create Protected Endpoint

```typescript
export const protectedEndpoint = createHandler(
  async (input, context) => {
    // context.userId is available
    return { success: true };
  },
  {
    middleware: [withAuth],
  }
);
```

## TypeScript Types

```typescript
import type {
  ErrorResponse,
  SuccessResponse,
  RequestContext,
  Handler,
  Middleware,
} from './lib/errors';
```

## Best Practices

1. Use specific error classes
2. Include context in errors
3. Log before throwing
4. Handle non-critical errors gracefully
5. Use retry logic for transient errors
6. Return typed responses
7. Mask secrets in logs
8. Validate environment on startup

## Resources

- Full docs: `ERROR_HANDLING_GUIDE.md`
- Examples: `src/lib/error-handling-examples.ts`
- Summary: `IMPLEMENTATION_SUMMARY.md`
