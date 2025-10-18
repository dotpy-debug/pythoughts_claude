# Rate Limiting Documentation

This project implements comprehensive rate limiting at both server-side (Redis-based) and client-side (localStorage-based) levels.

## Server-Side Rate Limiting

### Overview
Server-side rate limiting uses Redis to enforce limits across distributed systems. It implements the Token Bucket algorithm for precise, fair rate limiting.

### Usage in Server Actions/API Routes

```typescript
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit';

// In a Server Action
export async function createPost(data: PostData) {
  const headers = await headers(); // Next.js headers()
  const userId = await getCurrentUserId();

  // Enforce rate limit before processing
  await enforceRateLimit('POST_CREATE', userId);

  // Process the request
  // ...
}

// In an API route (rate limit by IP)
export async function POST(request: Request) {
  const ip = getClientIp(request.headers);

  await enforceRateLimit('API_WRITE', ip);

  // Process the request
  // ...
}
```

### Available Rate Limits

| Operation | Limit | Window | Description |
|-----------|-------|--------|-------------|
| `AUTH_LOGIN` | 5 | 5 min | Login attempts per IP |
| `AUTH_SIGNUP` | 3 | 1 hour | Signups per IP |
| `AUTH_PASSWORD_RESET` | 3 | 1 hour | Password resets per IP |
| `POST_CREATE` | 10 | 1 hour | Post creation per user |
| `POST_UPDATE` | 30 | 1 hour | Post updates per user |
| `POST_DELETE` | 10 | 1 hour | Post deletions per user |
| `COMMENT_CREATE` | 30 | 1 hour | Comment creation per user |
| `COMMENT_UPDATE` | 50 | 1 hour | Comment updates per user |
| `VOTE_CREATE` | 100 | 1 hour | Votes per user |
| `REPORT_CREATE` | 10 | 1 hour | Reports per user |
| `API_READ` | 300 | 1 min | API reads per IP |
| `API_WRITE` | 100 | 1 min | API writes per user |
| `SEARCH` | 20 | 1 min | Search queries per IP |

### Advanced Usage

#### Checking Without Enforcing

```typescript
import { checkRateLimit } from '@/lib/rate-limit';

const result = await checkRateLimit('POST_CREATE', userId);

if (!result.success) {
  return {
    error: 'Rate limit exceeded',
    retryAfter: result.retryAfter,
    limit: result.limit,
    reset: result.reset
  };
}

// Proceed with operation
```

#### Getting Current Status

```typescript
import { getRateLimitStatus } from '@/lib/rate-limit';

const status = await getRateLimitStatus('POST_CREATE', userId);

console.log(`Remaining: ${status.remaining}/${status.limit}`);
console.log(`Resets in: ${status.reset - Math.floor(Date.now() / 1000)}s`);
```

#### Resetting Limits (Admin/Testing)

```typescript
import { resetRateLimit } from '@/lib/rate-limit';

await resetRateLimit('POST_CREATE', userId);
```

### Error Handling

```typescript
import { RateLimitError } from '@/lib/rate-limit';

try {
  await enforceRateLimit('POST_CREATE', userId);
  // Process request
} catch (error) {
  if (error instanceof RateLimitError) {
    return {
      error: error.message,
      retryAfter: error.retryAfter,
      limit: error.limit,
      reset: error.reset
    };
  }
  throw error;
}
```

## Client-Side Rate Limiting

### Overview
Client-side rate limiting uses localStorage to provide immediate feedback without server round-trips. It's useful for preventing accidental spam and improving UX.

### Usage in React Components

#### Using the Hook

```typescript
import { useRateLimit } from '@/hooks/useRateLimit';

function CreatePostForm() {
  const {
    rateLimitedCall,
    remaining,
    limit,
    resetTime
  } = useRateLimit('POST_CREATE');

  const handleSubmit = async (data: PostData) => {
    try {
      await rateLimitedCall(async () => {
        // Your API call here
        await createPost(data);
      });

      toast.success('Post created!');
    } catch (error) {
      if (error.message.includes('Rate limit exceeded')) {
        toast.error(error.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <p className="text-sm text-gray-500">
        {remaining}/{limit} posts remaining
      </p>
    </form>
  );
}
```

#### Using the Wrapper Function

```typescript
import { withRateLimit } from '@/hooks/useRateLimit';

// Wrap your API function
const createPost = withRateLimit('POST_CREATE', async (data: PostData) => {
  const response = await supabase.from('posts').insert(data);
  return response;
});

// Use normally - rate limiting is automatic
await createPost(postData);
```

### Available Client Rate Limits

| Operation | Limit | Window | Description |
|-----------|-------|--------|-------------|
| `POST_CREATE` | 10 | 1 min | Post creation |
| `POST_UPDATE` | 30 | 1 min | Post updates |
| `POST_DELETE` | 5 | 1 min | Post deletions |
| `COMMENT_CREATE` | 30 | 1 min | Comment creation |
| `COMMENT_UPDATE` | 50 | 1 min | Comment updates |
| `VOTE_CREATE` | 100 | 1 min | Votes |
| `REPORT_CREATE` | 5 | 1 min | Reports |
| `SEARCH` | 20 | 1 min | Search queries |

### Display Rate Limit Info

```typescript
function ActionButton() {
  const { remaining, limit, resetTime } = useRateLimit('COMMENT_CREATE');

  const secondsUntilReset = Math.ceil((resetTime - Date.now()) / 1000);

  return (
    <div>
      <Button disabled={remaining === 0}>
        Create Comment
      </Button>
      {remaining === 0 && (
        <p className="text-red-500 text-sm">
          Rate limit reached. Try again in {secondsUntilReset}s
        </p>
      )}
      <p className="text-gray-500 text-xs">
        {remaining}/{limit} remaining
      </p>
    </div>
  );
}
```

## Best Practices

### 1. Combine Server and Client Rate Limiting

Use client-side limits for immediate feedback and server-side limits as the source of truth:

```typescript
// Client-side
const { rateLimitedCall } = useRateLimit('POST_CREATE');

const handleCreate = async (data: PostData) => {
  // Client-side check (immediate feedback)
  await rateLimitedCall(async () => {
    // Server-side enforcement (source of truth)
    await createPostAction(data);
  });
};
```

### 2. Show Helpful Error Messages

```typescript
try {
  await enforceRateLimit('POST_CREATE', userId);
} catch (error) {
  if (error instanceof RateLimitError) {
    const minutes = Math.ceil(error.retryAfter / 60);
    throw new Error(
      `You're creating posts too quickly. Please wait ${minutes} minute${minutes > 1 ? 's' : ''}.`
    );
  }
}
```

### 3. Different Limits for Different User Roles

```typescript
const limit = isPremiumUser
  ? 'POST_CREATE_PREMIUM'  // Higher limits
  : 'POST_CREATE';         // Standard limits

await enforceRateLimit(limit, userId);
```

### 4. Progressive Rate Limiting

```typescript
const { remaining } = useRateLimit('COMMENT_CREATE');

// Show warning when approaching limit
if (remaining < 5) {
  toast.warning(`Only ${remaining} comments remaining this hour`);
}
```

### 5. Graceful Degradation

Both implementations fail open (allow requests) if Redis/localStorage fails, ensuring availability over strict enforcement.

## Testing

### Server-Side Tests

```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(async () => {
    await resetRateLimit('POST_CREATE', 'test-user');
  });

  it('should enforce limits', async () => {
    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimit('POST_CREATE', 'test-user');
      expect(result.success).toBe(true);
    }

    const exceeded = await checkRateLimit('POST_CREATE', 'test-user');
    expect(exceeded.success).toBe(false);
  });
});
```

### Client-Side Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useRateLimit } from '@/hooks/useRateLimit';

describe('useRateLimit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should track requests', () => {
    const { result } = renderHook(() => useRateLimit('POST_CREATE'));

    act(() => {
      result.current.checkLimit();
    });

    expect(result.current.remaining).toBe(9);
  });
});
```

## Monitoring

### Logging

Rate limit events are automatically logged:

```typescript
logger.warn('Rate limit exceeded', {
  limitKey: 'POST_CREATE',
  identifier: userId,
  count: 11,
  limit: 10,
  retryAfter: 3420
});
```

### Metrics

Track rate limit violations in your analytics:

```typescript
if (!result.success) {
  analytics.track('rate_limit_exceeded', {
    operation: limitKey,
    user: userId,
    timestamp: Date.now()
  });
}
```

## Troubleshooting

### Redis Connection Issues

If Redis is unavailable, rate limiting fails open:

```typescript
// Request is allowed even if Redis fails
const result = await checkRateLimit('POST_CREATE', userId);
// result.success will be true on Redis errors
```

### localStorage Quota Exceeded

Client-side limits clean up old timestamps automatically, but you can manually reset:

```typescript
const { reset } = useRateLimit('POST_CREATE');
reset(); // Clears local state
```

### Testing in Development

Disable rate limiting in development:

```typescript
// .env.local
DISABLE_RATE_LIMITING=true

// In your code
const shouldEnforceLimit = process.env.NODE_ENV === 'production';

if (shouldEnforceLimit) {
  await enforceRateLimit('POST_CREATE', userId);
}
```

## Performance Considerations

- **Redis Pipelining**: Server-side implementation uses Redis pipelines for atomic operations
- **Local Cleanup**: Client-side implementation cleans up old timestamps every 30 seconds
- **No Blocking**: Both implementations are non-blocking and async
- **Memory Efficient**: Old timestamps are pruned automatically

## Security Considerations

1. **Server-Side is Authoritative**: Always enforce limits server-side; client-side is for UX only
2. **IP Spoofing**: Use trusted proxy headers (x-forwarded-for) carefully
3. **Distributed Denial of Service**: Rate limits help mitigate DDoS attacks
4. **Bypass Prevention**: Use unique identifiers (user ID + IP) for critical operations
