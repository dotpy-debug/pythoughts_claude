import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

interface AllTheProvidersProps {
  children: ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <AuthProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withProviders?: boolean;
}

/**
 * Custom render function that includes all necessary providers
 * @param ui - The component to render
 * @param options - Render options
 */
function customRender(
  ui: ReactElement,
  { withProviders = true, ...options }: CustomRenderOptions = {}
) {
  const wrapper = withProviders ? AllTheProviders : undefined;
  return render(ui, { wrapper, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

/**
 * Helper to wait for async updates
 */
export const waitForNextUpdate = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Helper to create mock user
 */
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Helper to create mock post
 */
export const createMockPost = (overrides = {}) => ({
  id: 'test-post-id',
  title: 'Test Post',
  content: 'This is a test post content',
  authorId: 'test-user-id',
  author: createMockUser(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  tags: ['test', 'sample'],
  ...overrides,
});

/**
 * Helper to create mock comment
 */
export const createMockComment = (overrides = {}) => ({
  id: 'test-comment-id',
  content: 'This is a test comment',
  authorId: 'test-user-id',
  author: createMockUser(),
  postId: 'test-post-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Helper to create mock notification
 */
export const createMockNotification = (overrides = {}) => ({
  id: 'test-notification-id',
  type: 'like' as const,
  message: 'Someone liked your post',
  read: false,
  createdAt: new Date().toISOString(),
  userId: 'test-user-id',
  actorId: 'other-user-id',
  actor: createMockUser({ id: 'other-user-id', username: 'otheruser' }),
  ...overrides,
});
