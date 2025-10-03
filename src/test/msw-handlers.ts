import { http, HttpResponse } from 'msw';
import { mockUsers, mockPosts, mockComments, mockNotifications, mockTasks } from './mock-data';

const API_URL = 'http://localhost:3000';

export const handlers = [
  // Auth handlers
  http.post(`${API_URL}/api/auth/signin`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'alice@pythoughts.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUsers.alice,
        token: 'mock-jwt-token',
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/api/auth/signup`, async ({ request }) => {
    const body = await request.json() as any;

    return HttpResponse.json({
      user: {
        id: 'new-user-id',
        email: body.email,
        username: body.username,
        displayName: body.displayName,
        createdAt: new Date().toISOString(),
      },
      token: 'mock-jwt-token',
    });
  }),

  http.post(`${API_URL}/api/auth/signout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_URL}/api/auth/me`, () => {
    return HttpResponse.json({ user: mockUsers.alice });
  }),

  // Post handlers
  http.get(`${API_URL}/api/posts`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    // cursor could be used for pagination in the future
    // const cursor = url.searchParams.get('cursor');

    return HttpResponse.json({
      posts: mockPosts.slice(0, limit),
      nextCursor: mockPosts.length > limit ? 'next-cursor' : null,
    });
  }),

  http.get(`${API_URL}/api/posts/trending`, () => {
    return HttpResponse.json({
      posts: mockPosts.slice(0, 2),
    });
  }),

  http.get(`${API_URL}/api/posts/:id`, ({ params }) => {
    const post = mockPosts.find((p) => p.id === params.id);

    if (!post) {
      return HttpResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ post });
  }),

  http.post(`${API_URL}/api/posts`, async ({ request }) => {
    const body = await request.json() as any;

    const newPost = {
      id: `post-${Date.now()}`,
      ...body,
      authorId: 'user-alice',
      author: mockUsers.alice,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ post: newPost }, { status: 201 });
  }),

  http.patch(`${API_URL}/api/posts/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    const post = mockPosts.find((p) => p.id === params.id);

    if (!post) {
      return HttpResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const updatedPost = {
      ...post,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ post: updatedPost });
  }),

  http.delete(`${API_URL}/api/posts/:id`, ({ params }) => {
    const post = mockPosts.find((p) => p.id === params.id);

    if (!post) {
      return HttpResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true });
  }),

  // Comment handlers
  http.get(`${API_URL}/api/posts/:postId/comments`, ({ params }) => {
    const comments = mockComments.filter((c) => c.postId === params.postId);
    return HttpResponse.json({ comments });
  }),

  http.post(`${API_URL}/api/posts/:postId/comments`, async ({ params, request }) => {
    const body = await request.json() as any;

    const newComment = {
      id: `comment-${Date.now()}`,
      content: body.content,
      authorId: 'user-alice',
      author: mockUsers.alice,
      postId: params.postId as string,
      parentId: body.parentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ comment: newComment }, { status: 201 });
  }),

  // Notification handlers
  http.get(`${API_URL}/api/notifications`, () => {
    return HttpResponse.json({ notifications: mockNotifications });
  }),

  http.patch(`${API_URL}/api/notifications/:id/read`, ({ params }) => {
    const notification = mockNotifications.find((n) => n.id === params.id);

    if (!notification) {
      return HttpResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      notification: { ...notification, read: true },
    });
  }),

  // Task handlers
  http.get(`${API_URL}/api/tasks`, () => {
    return HttpResponse.json({ tasks: mockTasks });
  }),

  http.post(`${API_URL}/api/tasks`, async ({ request }) => {
    const body = await request.json() as any;

    const newTask = {
      id: `task-${Date.now()}`,
      ...body,
      authorId: 'user-alice',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ task: newTask }, { status: 201 });
  }),

  // Like handlers
  http.post(`${API_URL}/api/posts/:id/like`, () => {
    // params would be used in real implementation
    return HttpResponse.json({ success: true, liked: true });
  }),

  http.delete(`${API_URL}/api/posts/:id/like`, () => {
    // params would be used in real implementation
    return HttpResponse.json({ success: true, liked: false });
  }),

  // Reaction handlers
  http.post(`${API_URL}/api/posts/:id/reactions`, async ({ request }) => {
    const body = await request.json() as any;

    return HttpResponse.json({
      success: true,
      reaction: { emoji: body.emoji, count: 1 },
    });
  }),
];
