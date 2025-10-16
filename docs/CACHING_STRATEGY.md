# Redis Caching Strategy - Phase 3B

**Date**: 2025-10-16
**Phase**: Production Readiness Phase 3 - Performance & Optimization
**Status**: Implementation Plan

---

## Executive Summary

This document provides a comprehensive caching strategy for the Pythoughts application, building on the existing Redis infrastructure. The strategy focuses on **maximizing cache hits**, **minimizing database load**, and **maintaining data consistency** through intelligent cache invalidation.

### Current State

✅ **Infrastructure**: Redis client with retry logic and error handling (excellent implementation)
✅ **Working Example**: Trending posts caching (template for all other caching)
❌ **Coverage**: Only trending posts are cached (~5% of queries)
❌ **Hit Rate**: Unknown (no monitoring in place)

### Goals

- **Database Load**: Reduce by 70% through aggressive caching
- **Cache Hit Rate**: Target 80%+ for frequently accessed data
- **Response Time**: Sub-50ms for cached queries (currently 150-200ms)
- **Consistency**: Zero stale data through proper invalidation

---

## Table of Contents

1. [Current Redis Implementation Review](#1-current-redis-implementation-review)
2. [Caching Architecture](#2-caching-architecture)
3. [Cache Key Design](#3-cache-key-design)
4. [TTL Strategy](#4-ttl-strategy)
5. [Implementation Plan](#5-implementation-plan)
6. [Cache Invalidation Strategy](#6-cache-invalidation-strategy)
7. [Monitoring & Metrics](#7-monitoring--metrics)
8. [Best Practices](#8-best-practices)

---

## 1. Current Redis Implementation Review

### ✅ Excellent Foundation

**File**: `src/lib/redis.ts`

**Strengths**:
```typescript
// 1. Singleton pattern with lazy initialization
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(serverEnv.REDIS_URL, {
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  }
  return redisClient;
}

// 2. Retry logic with exponential backoff
export async function cacheGet<T>(key: string): Promise<T | null> {
  const cached = await withRetry(
    () => redis.get(key),
    {
      maxRetries: 2,
      initialDelay: 100,
      shouldRetry: (error) => isRetryableError(error),
    }
  );
  return cached ? JSON.parse(cached) : null;
}

// 3. Cache key constants
export const CACHE_KEYS = {
  POSTS: (type: string) => `posts:${type}`,
  POST: (id: string) => `post:${id}`,
  USER_PROFILE: (id: string) => `profile:${id}`,
  // ... more keys
};

// 4. TTL constants
export const CACHE_TTL = {
  SHORT: 60,      // 1 minute
  MEDIUM: 300,    // 5 minutes
  LONG: 1800,     // 30 minutes
  VERY_LONG: 3600 // 1 hour
};
```

**This is production-ready infrastructure** ✅

---

## 2. Caching Architecture

### Layered Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Client (React Query)                           │
│ - Stale-while-revalidate                                │
│ - Optimistic updates                                    │
│ - In-memory cache (5 seconds)                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Redis Cache (Server-side)                      │
│ - Shared across all users                               │
│ - TTL-based expiration                                  │
│ - Pattern-based invalidation                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Database (PostgreSQL)                          │
│ - Source of truth                                       │
│ - Query on cache miss                                   │
│ - Indexed for performance                               │
└─────────────────────────────────────────────────────────┘
```

### Cache Flow Diagram

```typescript
async function getCachedData<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  // 1. Check cache
  const cached = await cacheGet<T>(cacheKey);
  if (cached) {
    console.log(`[Cache] HIT: ${cacheKey}`);
    return cached;
  }

  // 2. Cache miss - query database
  console.log(`[Cache] MISS: ${cacheKey}`);
  const data = await queryFn();

  // 3. Store in cache
  await cacheSet(cacheKey, data, ttl);

  return data;
}
```

---

## 3. Cache Key Design

### Naming Convention

```
{resource}:{identifier}:{filter}:{sort}:{page}
```

**Examples**:
```
posts:news:hot:1            - News posts, hot sort, page 1
posts:news:new:1            - News posts, new sort, page 1
blogs:Tech:1                - Tech blogs, page 1
comments:post-123           - Comments for post 123
votes:user-456              - All votes by user 456
reactions:post-789          - Reactions for post 789
claps:post-789              - Claps for post 789
```

### Expanded CACHE_KEYS

**Recommendation**: Add to `src/lib/redis.ts`

```typescript
export const CACHE_KEYS = {
  // ========== EXISTING KEYS ==========
  POSTS: (type: string) => `posts:${type}`,
  POST: (id: string) => `post:${id}`,
  USER_PROFILE: (id: string) => `profile:${id}`,
  USER_VOTES: (userId: string) => `votes:${userId}`,
  TASKS: (userId: string) => `tasks:${userId}`,
  TASK: (id: string) => `task:${id}`,
  COMMENTS: (postId: string) => `comments:${postId}`,
  TASK_COMMENTS: (taskId: string) => `task_comments:${taskId}`,

  // ========== TRENDING KEYS (already working) ==========
  TRENDING_POSTS: (limit: number) => `trending:posts:limit:${limit}`,
  TRENDING_CATEGORY: (category: string, limit: number) =>
    `trending:posts:category:${category}:limit:${limit}`,
  TRENDING_STATS: () => `trending:stats`,
  TRENDING_SCORE: (postId: string) => `trending:score:${postId}`,

  // ========== NEW KEYS - POSTS & BLOGS ==========
  POSTS_LIST: (type: string, sort: string, page: number) =>
    `posts:${type}:${sort}:${page}`,
  POSTS_BY_AUTHOR: (authorId: string, page: number) =>
    `posts:author:${authorId}:${page}`,
  BLOGS_BY_CATEGORY: (category: string, page: number) =>
    `blogs:${category}:${page}`,
  FEATURED_POST: (type: string) => `featured:${type}`,

  // ========== NEW KEYS - COMMENTS ==========
  COMMENTS_THREAD: (postId: string) => `comments:thread:${postId}`,
  COMMENT_REPLIES: (commentId: string) => `comments:replies:${commentId}`,

  // ========== NEW KEYS - REACTIONS & ENGAGEMENT ==========
  REACTIONS: (postId?: string, commentId?: string) =>
    postId ? `reactions:post:${postId}` : `reactions:comment:${commentId}`,
  CLAPS: (postId: string) => `claps:${postId}`,
  CLAPS_USER: (postId: string, userId: string) => `claps:${postId}:${userId}`,

  // ========== NEW KEYS - USER DATA ==========
  USER_BOOKMARKS: (userId: string) => `bookmarks:${userId}`,
  USER_READING_LISTS: (userId: string) => `reading_lists:${userId}`,
  USER_TAG_FOLLOWS: (userId: string) => `tag_follows:${userId}`,
  USER_FOLLOWED_TAGS: (userId: string) => `user:${userId}:followed_tags`,

  // ========== NEW KEYS - TAGS ==========
  TAG_SUGGESTIONS: (query: string) => `tags:suggestions:${query.toLowerCase()}`,
  POPULAR_TAGS: (limit: number) => `tags:popular:${limit}`,

  // ========== NEW KEYS - READING PROGRESS ==========
  READING_PROGRESS: (userId: string, postId: string) =>
    `reading:${userId}:${postId}`,
};
```

---

## 4. TTL Strategy

### TTL Decision Matrix

| Data Type | TTL | Reasoning | Invalidate On |
|-----------|-----|-----------|---------------|
| **Static Content** | | | |
| User profiles | 30 min (LONG) | Rarely changes | Profile update |
| Post metadata | 5 min (MEDIUM) | Changes occasionally | Post edit |
| Blog content | 30 min (LONG) | Rarely edited | Blog edit |
| | | | |
| **Dynamic Lists** | | | |
| Posts (hot/new/top) | 5 min (MEDIUM) | Updates frequently | New post, vote |
| Blogs (by category) | 5 min (MEDIUM) | New posts added | New blog |
| Trending posts | 5 min (MEDIUM) | Score recalculation | Vote, comment, reaction |
| | | | |
| **Engagement Data** | | | |
| Vote counts | 1 min (SHORT) | Real-time updates | User votes |
| Comment counts | 1 min (SHORT) | Real-time updates | New comment |
| Reaction counts | 1 min (SHORT) | Real-time updates | New reaction |
| Clap counts | 2 min | Moderate updates | User claps |
| | | | |
| **User-Specific** | | | |
| User votes | 5 min (MEDIUM) | User-specific, stable | User votes |
| User bookmarks | 10 min | User-specific, stable | Bookmark add/remove |
| Followed tags | 10 min | Rarely changes | Follow/unfollow |
| Reading progress | 5 min (MEDIUM) | Updates while reading | Progress save |
| | | | |
| **Search & Discovery** | | | |
| Tag suggestions | 1 hour (VERY_LONG) | Tags stable | New tag created |
| Popular tags | 30 min (LONG) | Slow-changing ranking | Post tagged |

### Updated TTL Constants

**Add to `src/lib/redis.ts`**:

```typescript
export const CACHE_TTL = {
  // Existing
  SHORT: 60,       // 1 minute - highly dynamic data
  MEDIUM: 300,     // 5 minutes - moderately dynamic
  LONG: 1800,      // 30 minutes - relatively static
  VERY_LONG: 3600, // 1 hour - nearly static

  // Specific use cases
  ENGAGEMENT: 60,       // Vote counts, reactions, comments
  USER_DATA: 600,       // User profiles, bookmarks, follows
  SEARCH: 3600,         // Tag suggestions, autocomplete
  TRENDING: 300,        // Trending algorithm results
  READING_PROGRESS: 300 // Reading position tracking
};
```

---

## 5. Implementation Plan

### Phase 3B-1: PostList Caching (Week 6, Day 1-2)

**File**: `src/components/posts/PostList.tsx`

**Current Implementation** (no caching):
```typescript
const loadPosts = useCallback(async () => {
  setLoading(true);
  try {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .eq('post_type', postType)
      .eq('is_published', true);
    setPosts(data || []);
  } catch (error) {
    console.error('Error loading posts:', error);
  } finally {
    setLoading(false);
  }
}, [postType, sortBy]);
```

**Proposed Implementation** (with caching):
```typescript
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '../../lib/redis';

const loadPosts = useCallback(async () => {
  setLoading(true);
  try {
    // 1. Build cache key
    const cacheKey = CACHE_KEYS.POSTS_LIST(postType, sortBy, 1);

    // 2. Try cache first (server-side only)
    let posts: Post[] | null = null;
    if (typeof window === 'undefined') {
      posts = await cacheGet<Post[]>(cacheKey);
    }

    if (posts) {
      console.log('[PostList] Cache HIT:', cacheKey);
      setPosts(posts);
      setLoading(false);
      return;
    }

    console.log('[PostList] Cache MISS:', cacheKey);

    // 3. Query database on cache miss
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        subtitle,
        vote_count,
        comment_count,
        created_at,
        category,
        image_url,
        profiles:author_id(id, username, avatar_url)
      `)
      .eq('post_type', postType)
      .eq('is_published', true)
      .order(sortBy === 'hot' ? 'vote_count' : 'created_at', { ascending: false })
      .limit(50);  // Add pagination

    if (error) throw error;

    const postsData = data || [];
    setPosts(postsData);

    // 4. Cache the result (server-side only)
    if (typeof window === 'undefined') {
      await cacheSet(cacheKey, postsData, CACHE_TTL.MEDIUM);
    }

  } catch (error) {
    console.error('Error loading posts:', error);
  } finally {
    setLoading(false);
  }
}, [postType, sortBy]);
```

**Estimated Impact**:
- Cache hit ratio: 70-80%
- Response time: 150ms → 10ms (cache hit)
- Database load: -70%

---

### Phase 3B-2: BlogGrid Caching (Week 6, Day 2-3)

**File**: `src/components/blogs/BlogGrid.tsx`

**Implementation** (similar pattern):
```typescript
const loadBlogs = useCallback(async () => {
  setLoading(true);
  try {
    const cacheKey = selectedCategory === 'All'
      ? CACHE_KEYS.POSTS_LIST('blog', 'new', 1)
      : CACHE_KEYS.BLOGS_BY_CATEGORY(selectedCategory, 1);

    // Server-side cache check
    let blogs: Post[] | null = null;
    if (typeof window === 'undefined') {
      blogs = await cacheGet<Post[]>(cacheKey);
    }

    if (blogs) {
      console.log('[BlogGrid] Cache HIT:', cacheKey);
      setPosts(blogs);
      setLoading(false);
      return;
    }

    console.log('[BlogGrid] Cache MISS:', cacheKey);

    // Database query with explicit fields
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        subtitle,
        content,
        author_id,
        image_url,
        category,
        reading_time_minutes,
        created_at,
        vote_count,
        comment_count,
        profiles:author_id(id, username, avatar_url)
      `)
      .eq('post_type', 'blog')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(30);

    if (selectedCategory !== 'All') {
      query = query.eq('category', selectedCategory);
    }

    const { data, error } = await query;
    if (error) throw error;

    const blogsData = data || [];
    setPosts(blogsData);

    // Cache the result
    if (typeof window === 'undefined') {
      await cacheSet(cacheKey, blogsData, CACHE_TTL.MEDIUM);
    }

  } catch (error) {
    console.error('Error loading blogs:', error);
  } finally {
    setLoading(false);
  }
}, [selectedCategory]);
```

---

### Phase 3B-3: CommentSection Caching (Week 6, Day 3-4)

**File**: `src/components/comments/CommentSection.tsx`

**Special Consideration**: Real-time subscriptions + caching

```typescript
const loadComments = useCallback(async () => {
  try {
    const cacheKey = CACHE_KEYS.COMMENTS_THREAD(postId);

    // Server-side cache check (short TTL since real-time)
    let comments: Comment[] | null = null;
    if (typeof window === 'undefined') {
      comments = await cacheGet<Comment[]>(cacheKey);
    }

    if (comments) {
      console.log('[Comments] Cache HIT:', cacheKey);
      const tree = buildCommentTree(comments);
      setComments(tree);
      setLoading(false);
      return;
    }

    console.log('[Comments] Cache MISS:', cacheKey);

    // Database query
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        author_id,
        post_id,
        parent_comment_id,
        depth,
        vote_count,
        created_at,
        profiles:author_id(id, username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const commentsData = data || [];
    const tree = buildCommentTree(commentsData);
    setComments(tree);

    // Cache with SHORT TTL (1 minute) due to real-time nature
    if (typeof window === 'undefined') {
      await cacheSet(cacheKey, commentsData, CACHE_TTL.SHORT);
    }

  } catch (error) {
    console.error('Error loading comments:', error);
  } finally {
    setLoading(false);
  }
}, [postId]);

// Real-time subscription still active - invalidates cache on changes
useEffect(() => {
  loadComments();

  const channel = supabase
    .channel(`comments:${postId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'comments',
      filter: `post_id=eq.${postId}`
    }, () => {
      // Invalidate cache when new comment arrives
      if (typeof window === 'undefined') {
        cacheDelete(CACHE_KEYS.COMMENTS_THREAD(postId));
      }
      loadComments();  // Reload from database
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [postId, loadComments]);
```

---

### Phase 3B-4: User-Specific Data Caching (Week 6, Day 4-5)

**Context Provider**: Create `src/contexts/UserDataContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '../lib/redis';
import { supabase } from '../lib/supabase';

interface UserDataContextType {
  followedTags: string[];
  bookmarkedPosts: string[];
  readingLists: ReadingList[];
  userVotes: Record<string, 1 | -1>;
  loading: boolean;
  refreshFollowedTags: () => Promise<void>;
  refreshBookmarks: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followedTags, setFollowedTags] = useState<string[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);

  const loadFollowedTags = async () => {
    if (!user) return;

    const cacheKey = CACHE_KEYS.USER_FOLLOWED_TAGS(user.id);

    // Try cache first
    let cached = null;
    if (typeof window === 'undefined') {
      cached = await cacheGet<string[]>(cacheKey);
    }

    if (cached) {
      console.log('[UserData] Followed tags cache HIT');
      setFollowedTags(cached);
      return;
    }

    console.log('[UserData] Followed tags cache MISS');

    // Load from database
    const { data } = await supabase
      .from('tag_follows')
      .select('tag_id')
      .eq('user_id', user.id);

    const tagIds = data?.map(t => t.tag_id) || [];
    setFollowedTags(tagIds);

    // Cache for 10 minutes
    if (typeof window === 'undefined') {
      await cacheSet(cacheKey, tagIds, CACHE_TTL.USER_DATA);
    }
  };

  const loadBookmarks = async () => {
    if (!user) return;

    const cacheKey = CACHE_KEYS.USER_BOOKMARKS(user.id);

    let cached = null;
    if (typeof window === 'undefined') {
      cached = await cacheGet<string[]>(cacheKey);
    }

    if (cached) {
      console.log('[UserData] Bookmarks cache HIT');
      setBookmarkedPosts(cached);
      return;
    }

    console.log('[UserData] Bookmarks cache MISS');

    const { data } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', user.id);

    const postIds = data?.map(b => b.post_id) || [];
    setBookmarkedPosts(postIds);

    if (typeof window === 'undefined') {
      await cacheSet(cacheKey, postIds, CACHE_TTL.USER_DATA);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        loadFollowedTags(),
        loadBookmarks(),
      ]).finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <UserDataContext.Provider value={{
      followedTags,
      bookmarkedPosts,
      readingLists,
      userVotes,
      loading,
      refreshFollowedTags: loadFollowedTags,
      refreshBookmarks: loadBookmarks,
    }}>
      {children}
    </UserDataContext.Provider>
  );
}

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within UserDataProvider');
  }
  return context;
};
```

**Usage in TagBadge.tsx**:
```typescript
// BEFORE: Individual query per tag
const checkFollowing = useCallback(async () => {
  const { data } = await supabase
    .from('tag_follows')
    .select('id')
    .eq('user_id', user.id)
    .eq('tag_id', tag.id)
    .maybeSingle();
  setIsFollowing(!!data);
}, [user, tag.id]);

// AFTER: Use context (loaded once, cached)
const { followedTags } = useUserData();
const isFollowing = followedTags.includes(tag.id);
```

**Impact**:
- TagBadge queries: 10 queries → 1 query (cached)
- Response time: 10 × 50ms = 500ms → <10ms
- Database load: -90%

---

## 6. Cache Invalidation Strategy

### Invalidation Patterns

#### Pattern 1: Single Resource Invalidation

**When**: User edits a post

```typescript
async function updatePost(postId: string, updates: Partial<Post>) {
  // 1. Update database
  await supabase.from('posts').update(updates).eq('id', postId);

  // 2. Invalidate specific post cache
  await cacheDelete(CACHE_KEYS.POST(postId));

  // 3. Invalidate lists containing this post
  await cacheDeletePattern('posts:*');
  await cacheDeletePattern('blogs:*');
  await cacheDeletePattern('trending:*');
}
```

#### Pattern 2: Pattern-Based Invalidation

**When**: User votes on a post

```typescript
async function voteOnPost(postId: string, userId: string, voteType: 1 | -1) {
  // 1. Update votes table
  await supabase.from('votes').insert({ user_id: userId, post_id: postId, vote_type: voteType });

  // 2. Invalidate post (vote count changed)
  await cacheDelete(CACHE_KEYS.POST(postId));

  // 3. Invalidate all post lists (sorting affected)
  await cacheDeletePattern('posts:*');

  // 4. Invalidate trending (score recalculation)
  await cacheDeletePattern('trending:*');

  // 5. Invalidate user's votes cache
  await cacheDelete(CACHE_KEYS.USER_VOTES(userId));
}
```

#### Pattern 3: User-Specific Invalidation

**When**: User bookmarks a post

```typescript
async function bookmarkPost(postId: string, userId: string) {
  // 1. Insert bookmark
  await supabase.from('bookmarks').insert({ user_id: userId, post_id: postId });

  // 2. Invalidate ONLY user's bookmarks (not global)
  await cacheDelete(CACHE_KEYS.USER_BOOKMARKS(userId));
}
```

### Invalidation Matrix

| Action | Invalidate Keys | Scope |
|--------|----------------|-------|
| **Post Created** | `posts:*`, `blogs:*`, `trending:*`, `profile:{authorId}` | Global + Author |
| **Post Updated** | `post:{id}`, `posts:*`, `blogs:*` | Global |
| **Post Deleted** | `post:{id}`, `posts:*`, `blogs:*`, `trending:*` | Global |
| **User Votes** | `post:{id}`, `posts:*`, `trending:*`, `votes:{userId}` | Global + User |
| **Comment Added** | `comments:{postId}`, `post:{id}` | Post-specific |
| **Reaction Added** | `reactions:{postId}`, `post:{id}` | Post-specific |
| **User Follows Tag** | `tag_follows:{userId}`, `user:{userId}:followed_tags` | User-only |
| **User Bookmarks** | `bookmarks:{userId}` | User-only |
| **Profile Updated** | `profile:{userId}`, `posts:author:{userId}:*` | User + Posts |

### Helper Functions

**Add to `src/lib/redis.ts`**:

```typescript
// ========== ENHANCED INVALIDATION HELPERS ==========

export async function invalidatePost(postId: string, postType: 'news' | 'blog'): Promise<void> {
  await Promise.all([
    cacheDelete(CACHE_KEYS.POST(postId)),
    cacheDeletePattern(`posts:${postType}:*`),
    cacheDeletePattern('trending:*'),
  ]);
}

export async function invalidatePostVote(postId: string, postType: 'news' | 'blog'): Promise<void> {
  await Promise.all([
    cacheDelete(CACHE_KEYS.POST(postId)),
    cacheDeletePattern(`posts:${postType}:*`),  // Sorting changes
    cacheDeletePattern('trending:*'),
  ]);
}

export async function invalidateComment(postId: string): Promise<void> {
  await Promise.all([
    cacheDelete(CACHE_KEYS.COMMENTS_THREAD(postId)),
    cacheDelete(CACHE_KEYS.POST(postId)),  // Comment count changed
  ]);
}

export async function invalidateUserBookmark(userId: string): Promise<void> {
  await cacheDelete(CACHE_KEYS.USER_BOOKMARKS(userId));
}

export async function invalidateUserTagFollow(userId: string): Promise<void> {
  await cacheDelete(CACHE_KEYS.USER_FOLLOWED_TAGS(userId));
}
```

---

## 7. Monitoring & Metrics

### Cache Performance Metrics

**Implement logging in `src/lib/redis.ts`**:

```typescript
// Track cache metrics
export const cacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  totalRequests: 0,
};

export async function cacheGet<T>(key: string): Promise<T | null> {
  cacheMetrics.totalRequests++;

  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);

    if (cached) {
      cacheMetrics.hits++;
      console.log(`[Cache] HIT (${cacheMetrics.hits}/${cacheMetrics.totalRequests} = ${getHitRate()}%): ${key}`);
      return JSON.parse(cached) as T;
    }

    cacheMetrics.misses++;
    console.log(`[Cache] MISS (${cacheMetrics.misses}/${cacheMetrics.totalRequests}): ${key}`);
    return null;

  } catch (error) {
    cacheMetrics.errors++;
    console.error('[Cache] ERROR:', error);
    return null;
  }
}

export function getHitRate(): number {
  if (cacheMetrics.totalRequests === 0) return 0;
  return Math.round((cacheMetrics.hits / cacheMetrics.totalRequests) * 100);
}

export function getCacheStats() {
  return {
    hits: cacheMetrics.hits,
    misses: cacheMetrics.misses,
    errors: cacheMetrics.errors,
    totalRequests: cacheMetrics.totalRequests,
    hitRate: getHitRate(),
  };
}

export function resetCacheMetrics() {
  cacheMetrics.hits = 0;
  cacheMetrics.misses = 0;
  cacheMetrics.errors = 0;
  cacheMetrics.totalRequests = 0;
}
```

### Monitoring Dashboard

**Create**: `src/app/api/cache-stats/route.ts`

```typescript
import { getCacheStats } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function GET() {
  const stats = getCacheStats();

  return NextResponse.json({
    cache: stats,
    timestamp: new Date().toISOString(),
  });
}
```

**Access**: `http://localhost:3000/api/cache-stats`

**Example Response**:
```json
{
  "cache": {
    "hits": 1420,
    "misses": 380,
    "errors": 2,
    "totalRequests": 1802,
    "hitRate": 79
  },
  "timestamp": "2025-10-16T12:34:56.789Z"
}
```

---

## 8. Best Practices

### ✅ DO

1. **Always handle cache misses gracefully**
   ```typescript
   const data = await cacheGet(key) || await queryDatabase();
   ```

2. **Use specific cache keys**
   ```typescript
   // ✅ GOOD: Specific
   CACHE_KEYS.POSTS_LIST('news', 'hot', 1)

   // ❌ BAD: Too generic
   'posts'
   ```

3. **Set appropriate TTLs**
   ```typescript
   // ✅ GOOD: Match data volatility
   await cacheSet(key, data, CACHE_TTL.SHORT);  // For votes
   await cacheSet(key, data, CACHE_TTL.LONG);   // For profiles
   ```

4. **Invalidate on mutations**
   ```typescript
   // ✅ GOOD: Invalidate after write
   await supabase.from('posts').insert(newPost);
   await invalidatePost(newPost.id, 'news');
   ```

5. **Log cache operations**
   ```typescript
   // ✅ GOOD: Visibility into cache behavior
   console.log('[Cache] HIT:', key);
   console.log('[Cache] MISS:', key);
   ```

### ❌ DON'T

1. **Don't cache client-side in window object**
   ```typescript
   // ❌ BAD: Client-side caching conflicts with Redis
   if (typeof window !== 'undefined') {
     localStorage.setItem('cache', JSON.stringify(data));
   }
   ```

2. **Don't use wildcard patterns for reads**
   ```typescript
   // ❌ BAD: Can't read with patterns
   await cacheGet('posts:*');  // Returns null

   // ✅ GOOD: Specific key
   await cacheGet('posts:news:hot:1');
   ```

3. **Don't cache errors**
   ```typescript
   // ❌ BAD: Caching error state
   try {
     const data = await queryDatabase();
     await cacheSet(key, data);  // Might cache null/error
   } catch (error) {
     await cacheSet(key, { error: true });  // DON'T DO THIS
   }

   // ✅ GOOD: Only cache successful results
   try {
     const data = await queryDatabase();
     if (data && data.length > 0) {
       await cacheSet(key, data);
     }
   } catch (error) {
     // Don't cache
   }
   ```

4. **Don't forget to invalidate**
   ```typescript
   // ❌ BAD: Stale data
   await supabase.from('posts').update({ title: 'New' }).eq('id', postId);
   // Forgot to invalidate cache

   // ✅ GOOD: Immediate invalidation
   await supabase.from('posts').update({ title: 'New' }).eq('id', postId);
   await invalidatePost(postId, 'news');
   ```

5. **Don't cache user-specific data globally**
   ```typescript
   // ❌ BAD: User A's data served to User B
   const key = 'user_votes';  // No user ID
   await cacheSet(key, userVotes);

   // ✅ GOOD: User-specific key
   const key = CACHE_KEYS.USER_VOTES(userId);
   await cacheSet(key, userVotes);
   ```

---

## Implementation Checklist

### Week 6 - Caching Implementation

**Day 1-2: PostList & BlogGrid**
- [ ] Add caching to PostList.tsx (hot/new/top)
- [ ] Add pagination to PostList (limit 50)
- [ ] Add caching to BlogGrid.tsx (by category)
- [ ] Add pagination to BlogGrid (limit 30)
- [ ] Test cache hit rates (target 70%+)

**Day 3-4: Comments & Engagement**
- [ ] Add caching to CommentSection.tsx (1-minute TTL)
- [ ] Add caching to ReactionBar.tsx
- [ ] Add caching to ClapButton.tsx
- [ ] Verify real-time subscriptions work with caching

**Day 4-5: User-Specific Data**
- [ ] Create UserDataProvider context
- [ ] Load followed tags once (batch query)
- [ ] Load user bookmarks once (batch query)
- [ ] Update TagBadge to use context
- [ ] Update BookmarkButton to use context

**Day 5: Invalidation & Testing**
- [ ] Add cache invalidation to all mutation functions
- [ ] Test invalidation triggers (vote, comment, bookmark)
- [ ] Implement cache metrics tracking
- [ ] Create /api/cache-stats endpoint
- [ ] Load test with cache monitoring

**Day 6-7: Monitoring & Optimization**
- [ ] Monitor cache hit rates in development
- [ ] Optimize TTLs based on actual usage patterns
- [ ] Document cache metrics
- [ ] Deploy to staging environment
- [ ] Monitor production cache performance

---

## Expected Results

### Performance Improvements

**Before Caching**:
- Posts query: 150ms (every request hits database)
- Comments query: 200ms (N+1 problem)
- Tag follow checks: 50ms × 10 = 500ms
- Total page load: 800ms+

**After Caching (80% hit rate)**:
- Posts query: 10ms (cache hit), 150ms (cache miss)
- Comments query: 10ms (cache hit), 75ms (optimized miss)
- Tag follow checks: <5ms (context provider)
- Total page load: 200-300ms

**Database Load**:
- Queries per second: -70%
- Database CPU usage: -60%
- Database memory: -50%

**User Experience**:
- Perceived performance: 60% faster
- Sub-second page loads
- Instant interactions (cached data)

---

## Next Steps

1. **Implement Phase 3B-1**: PostList caching
2. **Measure baseline**: Cache hit rates before optimization
3. **Iterate**: Adjust TTLs based on metrics
4. **Monitor**: Track performance improvements
5. **Document**: Update this guide with learnings

---

**Document Version**: 1.0
**Last Updated**: 2025-10-16
**Next Review**: After Phase 3B completion
**Maintained By**: DevOps & Performance Team
