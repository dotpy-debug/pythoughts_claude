/**
 * Mock data fixtures for testing
 */

export const mockUsers = {
  alice: {
    id: 'user-alice',
    email: 'alice@pythoughts.com',
    username: 'alice',
    displayName: 'Alice Developer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    bio: 'Full-stack developer passionate about React and TypeScript',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  bob: {
    id: 'user-bob',
    email: 'bob@pythoughts.com',
    username: 'bob',
    displayName: 'Bob Engineer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    bio: 'Backend engineer focused on scalability and performance',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  charlie: {
    id: 'user-charlie',
    email: 'charlie@pythoughts.com',
    username: 'charlie',
    displayName: 'Charlie Designer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
    bio: 'UI/UX designer who codes',
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
};

export const mockPosts = [
  {
    id: 'post-1',
    title: 'Introduction to React Server Components',
    content: `# React Server Components

Server Components are a new feature in React that allows you to render components on the server.
This provides better performance and smaller bundle sizes.

## Benefits
- Zero bundle size impact
- Direct access to backend resources
- Better performance
- Improved SEO`,
    authorId: 'user-alice',
    author: mockUsers.alice,
    tags: ['react', 'server-components', 'nextjs'],
    viewCount: 1250,
    likeCount: 89,
    commentCount: 12,
    createdAt: '2024-02-15T10:30:00.000Z',
    updatedAt: '2024-02-15T10:30:00.000Z',
  },
  {
    id: 'post-2',
    title: 'Building Scalable APIs with Node.js',
    content: `# Scalable API Design

Learn how to build APIs that can handle millions of requests.

## Key Principles
1. Use caching effectively
2. Implement rate limiting
3. Design for horizontal scaling
4. Monitor performance`,
    authorId: 'user-bob',
    author: mockUsers.bob,
    tags: ['nodejs', 'api', 'scalability', 'performance'],
    viewCount: 2300,
    likeCount: 156,
    commentCount: 28,
    createdAt: '2024-02-14T14:20:00.000Z',
    updatedAt: '2024-02-14T14:20:00.000Z',
  },
  {
    id: 'post-3',
    title: 'Modern CSS Techniques in 2024',
    content: `# CSS in 2024

The web has evolved, and so has CSS. Here are the latest techniques.

## What's New
- Container queries
- CSS layers
- Cascade layers
- Color mix()`,
    authorId: 'user-charlie',
    author: mockUsers.charlie,
    tags: ['css', 'frontend', 'design'],
    viewCount: 890,
    likeCount: 67,
    commentCount: 8,
    createdAt: '2024-02-16T09:15:00.000Z',
    updatedAt: '2024-02-16T09:15:00.000Z',
  },
];

export const mockComments = [
  {
    id: 'comment-1',
    content: 'Great explanation! This really helped me understand server components.',
    authorId: 'user-bob',
    author: mockUsers.bob,
    postId: 'post-1',
    parentId: null,
    createdAt: '2024-02-15T11:00:00.000Z',
    updatedAt: '2024-02-15T11:00:00.000Z',
  },
  {
    id: 'comment-2',
    content: 'Thanks! Glad it was helpful.',
    authorId: 'user-alice',
    author: mockUsers.alice,
    postId: 'post-1',
    parentId: 'comment-1',
    createdAt: '2024-02-15T11:15:00.000Z',
    updatedAt: '2024-02-15T11:15:00.000Z',
  },
  {
    id: 'comment-3',
    content: 'Could you add a section about error handling in server components?',
    authorId: 'user-charlie',
    author: mockUsers.charlie,
    postId: 'post-1',
    parentId: null,
    createdAt: '2024-02-15T12:30:00.000Z',
    updatedAt: '2024-02-15T12:30:00.000Z',
  },
];

export const mockNotifications = [
  {
    id: 'notif-1',
    type: 'like' as const,
    message: 'Bob liked your post "Introduction to React Server Components"',
    read: false,
    userId: 'user-alice',
    actorId: 'user-bob',
    actor: mockUsers.bob,
    relatedPostId: 'post-1',
    createdAt: '2024-02-16T10:00:00.000Z',
  },
  {
    id: 'notif-2',
    type: 'comment' as const,
    message: 'Charlie commented on your post',
    read: false,
    userId: 'user-alice',
    actorId: 'user-charlie',
    actor: mockUsers.charlie,
    relatedPostId: 'post-1',
    relatedCommentId: 'comment-3',
    createdAt: '2024-02-16T11:30:00.000Z',
  },
  {
    id: 'notif-3',
    type: 'follow' as const,
    message: 'Alice started following you',
    read: true,
    userId: 'user-bob',
    actorId: 'user-alice',
    actor: mockUsers.alice,
    createdAt: '2024-02-15T16:00:00.000Z',
  },
];

export const mockTasks = [
  {
    id: 'task-1',
    title: 'Implement authentication',
    description: 'Add user authentication with Better Auth',
    status: 'completed' as const,
    priority: 'high' as const,
    authorId: 'user-alice',
    assigneeId: 'user-alice',
    createdAt: '2024-02-10T00:00:00.000Z',
    updatedAt: '2024-02-12T00:00:00.000Z',
    completedAt: '2024-02-12T00:00:00.000Z',
    position: { x: 100, y: 100 },
  },
  {
    id: 'task-2',
    title: 'Design trending algorithm',
    description: 'Create algorithm for trending posts based on engagement',
    status: 'in_progress' as const,
    priority: 'high' as const,
    authorId: 'user-bob',
    assigneeId: 'user-bob',
    createdAt: '2024-02-11T00:00:00.000Z',
    updatedAt: '2024-02-16T00:00:00.000Z',
    position: { x: 300, y: 150 },
  },
  {
    id: 'task-3',
    title: 'Update UI components',
    description: 'Refresh component library with new design tokens',
    status: 'todo' as const,
    priority: 'medium' as const,
    authorId: 'user-charlie',
    assigneeId: 'user-charlie',
    createdAt: '2024-02-14T00:00:00.000Z',
    updatedAt: '2024-02-14T00:00:00.000Z',
    position: { x: 500, y: 200 },
  },
];

export const mockReactions = {
  'post-1': [
    { emoji: '👍', count: 45, userReacted: false },
    { emoji: '❤️', count: 23, userReacted: true },
    { emoji: '🚀', count: 21, userReacted: false },
  ],
  'post-2': [
    { emoji: '👍', count: 89, userReacted: true },
    { emoji: '🔥', count: 34, userReacted: false },
    { emoji: '💡', count: 33, userReacted: false },
  ],
};

export const mockTrendingScores = {
  'post-1': {
    postId: 'post-1',
    score: 0.847,
    rank: 1,
    calculatedAt: '2024-02-16T12:00:00.000Z',
  },
  'post-2': {
    postId: 'post-2',
    score: 0.923,
    rank: 2,
    calculatedAt: '2024-02-16T12:00:00.000Z',
  },
  'post-3': {
    postId: 'post-3',
    score: 0.645,
    rank: 3,
    calculatedAt: '2024-02-16T12:00:00.000Z',
  },
};
