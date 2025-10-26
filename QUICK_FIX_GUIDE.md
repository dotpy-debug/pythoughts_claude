# Quick Fix Guide - Common Patterns

This guide provides quick reference for fixing common issues identified in the codebase analysis.

---

## 1. Type Safety Fixes

### Fix: Replace `any` with Proper Types

#### Performance API Memory
```typescript
// ❌ Bad
const memory = (performance as any).memory;

// ✅ Good
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

const performanceWithMemory = performance as PerformanceWithMemory;
if (performanceWithMemory.memory) {
  const memory = performanceWithMemory.memory;
  // Use memory...
}
```

#### Window Extensions
```typescript
// ❌ Bad
(window as any).gc();

// ✅ Good
interface WindowWithGC extends Window {
  gc?: () => void;
}

const windowWithGC = window as WindowWithGC;
if (windowWithGC.gc) {
  windowWithGC.gc();
}
```

#### API Responses
```typescript
// ❌ Bad
const data = await fetch(url).then(r => r.json()) as any;

// ✅ Good
interface UserResponse {
  id: string;
  username: string;
  email: string;
}

const data = await fetch(url).then(r => r.json()) as UserResponse;
```

### Fix: Remove `@ts-ignore`

```typescript
// ❌ Bad
// @ts-ignore
document.getElementById('root').style.display = 'none';

// ✅ Good
const rootElement = document.getElementById('root');
if (rootElement instanceof HTMLElement) {
  rootElement.style.display = 'none';
}
```

---

## 2. Console.log Replacement

### Import Logger
```typescript
import { logger } from '../lib/logger';
```

### Replace Patterns

#### console.log → logger.info
```typescript
// ❌ Bad
console.log('User logged in:', userId);

// ✅ Good
logger.info('User logged in', { userId, timestamp: Date.now() });
```

#### console.error → logger.error
```typescript
// ❌ Bad
console.error('Failed to fetch:', error);

// ✅ Good
logger.error('Failed to fetch data', {
  error: error.message,
  stack: error.stack,
  context: 'DataFetch',
});
```

#### console.warn → logger.warn
```typescript
// ❌ Bad
console.warn('High memory usage:', usedMB);

// ✅ Good
logger.warn('High memory usage detected', {
  usedMB,
  threshold: 80,
  component: 'MemoryMonitor',
});
```

#### console.debug → logger.debug
```typescript
// ❌ Bad
console.debug('State updated:', state);

// ✅ Good
logger.debug('State updated', { state, component: 'MyComponent' });
```

---

## 3. TODO Implementation Templates

### Image Upload to Supabase Storage
```typescript
import { supabase } from '../lib/supabase';

async function uploadImage(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB');
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(fileName);

  return publicUrl;
}
```

### Email Invitation System
```typescript
import { sendEmail } from '../lib/email-service';

async function sendInvitation(email: string, publicationId: string) {
  const inviteUrl = `${window.location.origin}/publications/${publicationId}/accept-invite`;

  await sendEmail({
    to: email,
    subject: 'You\'re invited to join a publication',
    html: `
      <h1>Publication Invitation</h1>
      <p>You've been invited to join a publication on Pythoughts.</p>
      <a href="${inviteUrl}">Accept Invitation</a>
    `,
  });

  logger.info('Invitation sent', { email, publicationId });
}
```

### Chart Integration (Recharts)
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  views: number;
  engagement: number;
}

export function AnalyticsChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="views" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="engagement" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## 4. Database Query Optimization

### Selective Field Loading
```typescript
// ❌ Bad - Loads all fields
const { data: posts } = await supabase
  .from('posts')
  .select('*');

// ✅ Good - Loads only needed fields
const { data: posts } = await supabase
  .from('posts')
  .select(`
    id,
    title,
    content,
    author_id,
    created_at,
    vote_count,
    author:profiles(id, username, avatar_url)
  `);
```

### Pagination
```typescript
const PAGE_SIZE = 20;

async function fetchPosts(page: number = 0) {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from('posts')
    .select('id, title, content, author_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  return {
    posts: data,
    totalPages: count ? Math.ceil(count / PAGE_SIZE) : 0,
    currentPage: page,
  };
}
```

### Avoid N+1 Queries
```typescript
// ❌ Bad - N+1 queries (fetches author for each post)
const posts = await fetchPosts();
for (const post of posts) {
  const author = await fetchAuthor(post.author_id); // N queries
}

// ✅ Good - Single query with join
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles(id, username, avatar_url, bio)
  `);
```

---

## 5. React Performance Optimization

### React.memo
```typescript
import { memo } from 'react';

// ❌ Bad - Re-renders on every parent update
export function PostCard({ post }: { post: Post }) {
  return <div>{post.title}</div>;
}

// ✅ Good - Only re-renders when props change
export const PostCard = memo(function PostCard({ post }: { post: Post }) {
  return <div>{post.title}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.post.id === nextProps.post.id &&
         prevProps.post.vote_count === nextProps.post.vote_count;
});
```

### useCallback
```typescript
import { useCallback } from 'react';

function MyComponent() {
  // ❌ Bad - New function on every render
  const handleClick = () => {
    console.log('Clicked');
  };

  // ✅ Good - Stable function reference
  const handleClick = useCallback(() => {
    logger.info('Button clicked');
  }, []);

  return <Button onClick={handleClick}>Click me</Button>;
}
```

### useMemo
```typescript
import { useMemo } from 'react';

function PostList({ posts }: { posts: Post[] }) {
  // ❌ Bad - Filters on every render
  const trendingPosts = posts.filter(p => p.vote_count > 100);

  // ✅ Good - Memoized computation
  const trendingPosts = useMemo(
    () => posts.filter(p => p.vote_count > 100),
    [posts]
  );

  return <div>{trendingPosts.map(/* ... */)}</div>;
}
```

---

## 6. Error Handling Patterns

### Try-Catch with Logger
```typescript
async function fetchUserData(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Failed to fetch user data', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new Error('Unable to fetch user data');
  }
}
```

### Error Boundary Integration
```typescript
import { ErrorBoundary } from '../components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong</div>}
      onError={(error, errorInfo) => {
        logger.error('React error boundary caught error', {
          error: error.message,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      <MyComponent />
    </ErrorBoundary>
  );
}
```

---

## 7. Security Best Practices

### Environment Variables
```typescript
// ❌ Bad - Secret exposed to frontend
const apiKey = import.meta.env.VITE_API_KEY;

// ✅ Good - Secret only in backend
// Backend:
const apiKey = process.env.API_KEY; // No VITE_ prefix

// Frontend: Use API endpoint instead
const response = await fetch('/api/protected-operation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

### Input Sanitization
```typescript
import DOMPurify from 'dompurify';

// ❌ Bad - XSS vulnerability
function DisplayHTML({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ✅ Good - Sanitized HTML
function DisplayHTML({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

---

## 8. Testing Patterns

### Unit Test
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { formatBytes } from '../hooks/useMemoryMonitor';

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});
```

### Component Test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PostCard } from '../components/posts/PostCard';

describe('PostCard', () => {
  it('should render post title', () => {
    const post = {
      id: '1',
      title: 'Test Post',
      content: 'Test content',
    };

    render(<PostCard post={post} />);

    expect(screen.getByText('Test Post')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PostCard post={mockPost} onClick={onClick} />);

    fireEvent.click(screen.getByRole('article'));

    expect(onClick).toHaveBeenCalledWith(mockPost.id);
  });
});
```

---

## Quick Commands

### Find All Type Safety Issues
```bash
# Windows (PowerShell)
Get-ChildItem -Recurse -Filter *.ts,*.tsx | Select-String -Pattern "\bany\b|@ts-ignore|@ts-expect-error"

# Unix/Mac
grep -r "\bany\b\|@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx"
```

### Find All Console Calls
```bash
# Windows (PowerShell)
Get-ChildItem -Recurse -Filter *.ts,*.tsx | Select-String -Pattern "console\.(log|error|warn|debug)"

# Unix/Mac
grep -r "console\.\(log\|error\|warn\|debug\)" src/ --include="*.ts" --include="*.tsx"
```

### Run Type Checks
```bash
npm run type-check
# or
tsc --noEmit
```

### Run Tests
```bash
npm run test
# or
npm run test:coverage
```

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Vitest Documentation](https://vitest.dev/)
- [Logger Implementation](./src/lib/logger.ts)

---

**Last Updated:** October 2025
