# Testing Guide - Pythoughts Platform

Comprehensive testing strategy and documentation for the Pythoughts platform.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Unit Testing](#unit-testing)
- [Component Testing](#component-testing)
- [E2E Testing](#e2e-testing)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)
- [CI Integration](#ci-integration)

---

## Overview

The Pythoughts platform uses a comprehensive testing strategy with three layers:

1. **Unit Tests**: Test individual functions and utilities
2. **Component Tests**: Test React components in isolation
3. **E2E Tests**: Test complete user workflows

**Target Coverage**: 70% overall (configured in `vitest.config.ts`)

---

## Testing Stack

### Core Testing Libraries

- **Vitest**: Fast unit test runner (Vite-native)
- **React Testing Library**: Component testing
- **Playwright**: E2E browser testing
- **MSW (Mock Service Worker)**: API mocking

### Supporting Libraries

- **@testing-library/jest-dom**: Custom matchers
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM environment for Node

---

## Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Detailed Commands

```bash
# Unit Tests
npm run test              # Watch mode
npm run test:unit         # Run once
npm run test:watch        # Watch mode (explicit)
npm run test:ui           # Visual UI dashboard
npm run test:coverage     # With coverage report

# E2E Tests
npm run test:e2e          # Headless mode
npm run test:e2e:ui       # Interactive UI
npm run test:e2e:headed   # Show browser
npm run test:e2e:debug    # Debug mode

# Playwright Setup
npm run playwright:install  # Install browsers
```

---

## Unit Testing

### File Structure

```
src/
├── lib/
│   ├── trending.ts
│   └── trending.test.ts       # Unit tests for trending
├── utils/
│   ├── security.ts
│   └── security.test.ts       # Unit tests for security
└── test/
    ├── setup-tests.ts         # Global test setup
    ├── test-utils.tsx         # Test utilities
    ├── mock-data.ts           # Mock fixtures
    ├── msw-handlers.ts        # API mocks
    └── msw-server.ts          # MSW server config
```

### Writing Unit Tests

**Example: Testing a utility function**

```typescript
// src/utils/security.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeInput } from './security';

describe('sanitizeInput', () => {
  it('escapes HTML special characters', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeInput(input);
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('handles empty strings', () => {
    expect(sanitizeInput('')).toBe('');
  });
});
```

**Example: Testing the trending algorithm**

```typescript
// src/lib/trending.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTrendingScore } from './trending';

describe('Trending Algorithm', () => {
  it('calculates score for new post', () => {
    const post = {
      vote_count: 10,
      comment_count: 5,
      reaction_count: 20,
      created_at: new Date().toISOString(),
    };

    const score = calculateTrendingScore(post);
    expect(score).toBeGreaterThan(0);
  });

  it('applies age penalty to older posts', () => {
    const newPost = calculateTrendingScore({
      vote_count: 100,
      comment_count: 10,
      reaction_count: 20,
      created_at: new Date().toISOString(),
    });

    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 24);

    const oldPost = calculateTrendingScore({
      vote_count: 100,
      comment_count: 10,
      reaction_count: 20,
      created_at: oldDate.toISOString(),
    });

    expect(oldPost).toBeLessThan(newPost);
  });
});
```

---

## Component Testing

### Writing Component Tests

**Example: Testing a Button component**

```typescript
// src/components/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button').querySelector('svg')).toHaveClass('animate-spin');
  });
});
```

**Example: Testing a form component**

```typescript
// src/components/auth/SignInForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { SignInForm } from './SignInForm';

const mockSignIn = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    user: null,
    loading: false,
  }),
}));

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits form with credentials', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });

    render(<SignInForm onSuccess={() => {}} onToggleMode={() => {}} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays error on sign in failure', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });

    render(<SignInForm onSuccess={() => {}} onToggleMode={() => {}} />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

### Custom Test Utilities

```typescript
// src/test/test-utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';

function AllTheProviders({ children }) {
  return (
    <AuthProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthProvider>
  );
}

export function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

---

## E2E Testing

### File Structure

```
tests/
└── e2e/
    ├── auth.spec.ts          # Authentication flows
    ├── posts.spec.ts         # Post creation and interaction
    └── trending.spec.ts      # Trending algorithm validation
```

### Writing E2E Tests

**Example: Authentication flow**

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should sign in successfully', async ({ page }) => {
    await page.goto('/');
    await page.click('text=sign in');

    await page.fill('input[type="email"]', 'test@pythoughts.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('text=profile')).toBeVisible();
  });
});
```

**Example: Post creation**

```typescript
// tests/e2e/posts.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Post Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/');
    await page.click('text=sign in');
    await page.fill('input[type="email"]', 'test@pythoughts.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  });

  test('should create a new post', async ({ page }) => {
    await page.click('text=/create|new post/i');

    const postTitle = `Test Post ${Date.now()}`;
    await page.fill('input[placeholder*="title" i]', postTitle);
    await page.fill('textarea', 'Test content');
    await page.click('button:has-text("publish")');

    await expect(page.locator(`text=${postTitle}`)).toBeVisible({ timeout: 10000 });
  });
});
```

### Playwright Configuration

Key settings in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 retries on CI
- **Parallel execution**: Enabled
- **Video recording**: On failure
- **Screenshots**: On failure

---

## Test Coverage

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70,
  },
}
```

### What to Test

**High Priority (Target: >80% coverage)**
- Authentication logic
- Security utilities
- Trending algorithm
- Data transformations
- API client functions

**Medium Priority (Target: >70% coverage)**
- UI components
- Form validation
- Error handling
- State management

**Lower Priority**
- Style components
- Static content
- Configuration files

---

## Best Practices

### General Principles

1. **Write Tests First**: Follow TDD when possible
2. **Test Behavior, Not Implementation**: Focus on user-facing behavior
3. **Keep Tests Simple**: One assertion per test when possible
4. **Use Descriptive Names**: Test names should read like documentation
5. **Avoid Test Interdependence**: Each test should run independently

### Unit Tests

```typescript
// ✅ Good: Descriptive, single concern
it('calculates trending score based on votes and age', () => {
  const score = calculateTrendingScore(mockPost);
  expect(score).toBeGreaterThan(0);
});

// ❌ Bad: Vague, multiple concerns
it('works', () => {
  const score = calculateTrendingScore(mockPost);
  expect(score).toBeDefined();
  expect(score).toBeGreaterThan(0);
  expect(score).toBeLessThan(100);
});
```

### Component Tests

```typescript
// ✅ Good: User-centric queries
screen.getByRole('button', { name: /sign in/i });
screen.getByLabelText(/email/i);

// ❌ Bad: Implementation details
screen.getByClassName('signin-button');
screen.getByTestId('email-input');
```

### E2E Tests

```typescript
// ✅ Good: Realistic user flow
test('user can create and publish a post', async ({ page }) => {
  await signIn(page);
  await createPost(page, { title: 'Test', content: 'Content' });
  await expect(page.locator('text=Post published')).toBeVisible();
});

// ❌ Bad: Testing implementation
test('post creation endpoint works', async ({ page }) => {
  await page.request.post('/api/posts', { data: mockPost });
});
```

---

## CI Integration

### GitHub Actions Workflow

Tests run automatically on:
- Every pull request
- Push to `main` or `develop`

**CI Pipeline** (`.github/workflows/ci.yml`):
1. Code linting
2. Type checking
3. Unit tests with coverage
4. E2E tests (Chromium only)
5. Build verification

### Running Tests Locally Like CI

```bash
# Run full CI suite locally
npm run lint && npm run typecheck && npm run test:unit && npm run build

# Run E2E tests like CI
CI=true npm run test:e2e
```

### Debugging Failed CI Tests

```bash
# Download Playwright artifacts from GitHub Actions
# Go to Actions → Failed workflow → Artifacts

# Run failed test locally
npm run test:e2e:debug -- auth.spec.ts
```

---

## Mocking Strategies

### API Mocking with MSW

```typescript
// src/test/msw-handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/posts', () => {
    return HttpResponse.json({ posts: mockPosts });
  }),

  http.post('/api/posts', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ post: { id: '123', ...body } }, { status: 201 });
  }),
];
```

### Context Mocking

```typescript
// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
```

---

## Troubleshooting

### Common Issues

#### Tests Fail Locally But Pass on CI

**Cause**: Environment differences

**Solution**:
```bash
# Run with CI environment
CI=true npm run test:unit
```

#### Playwright Browsers Not Installed

**Solution**:
```bash
npm run playwright:install
```

#### Flaky E2E Tests

**Solution**: Add proper waits
```typescript
// ❌ Bad: Implicit wait
await page.click('button');

// ✅ Good: Explicit wait
await page.waitForSelector('button');
await page.click('button');
```

#### Coverage Not Generated

**Solution**:
```bash
# Install coverage provider
npm install -D @vitest/coverage-v8
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

---

**Last Updated:** January 2025
**Version:** 1.0.0
