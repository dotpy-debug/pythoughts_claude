# Integration Tests

This directory contains comprehensive integration tests for the Pythoughts blog platform API.

## Quick Start

### 1. Setup Environment

```bash
# Copy example env file
cp .env.test.example .env.test

# Edit .env.test with your test Supabase credentials
# REQUIRED: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 2. Run Tests

```bash
# Run all integration tests
npm run test:integration

# Watch mode
npm run test:integration:watch

# Specific file
npx vitest run src/tests/integration/auth.test.ts
```

## Test Files

| File | Tests | Description |
|------|-------|-------------|
| `setup.ts` | - | Test utilities, fixtures, cleanup functions |
| `auth.test.ts` | 18 | Authentication flow (signup, signin, signout, session) |
| `blogs.test.ts` | 28 | Blog CRUD operations and publishing workflow |
| `comments.test.ts` | 24 | Comments system with threaded replies |
| `profiles.test.ts` | 23 | User profile management |

**Total: 86+ integration tests**

## Test Coverage

### Authentication (`auth.test.ts`)
- ✅ User registration with validation
- ✅ Sign in with credentials
- ✅ Sign out and session cleanup
- ✅ Session verification
- ✅ Password reset flow
- ✅ Edge cases (empty fields, invalid format, etc.)

### Blog Posts (`blogs.test.ts`)
- ✅ Create posts with all fields
- ✅ Read single and multiple posts
- ✅ Update posts (title, content, metadata)
- ✅ Delete posts with cascade
- ✅ Draft vs published workflow
- ✅ Filter by category, status
- ✅ Post statistics initialization

### Comments (`comments.test.ts`)
- ✅ Create top-level comments
- ✅ Threaded replies (nested, multi-level)
- ✅ Update comment content
- ✅ Soft delete vs hard delete
- ✅ Pin/unpin comments
- ✅ List comments with filtering
- ✅ Special characters and long content

### User Profiles (`profiles.test.ts`)
- ✅ Get profile by ID/username
- ✅ Update profile fields
- ✅ Unique username enforcement
- ✅ Admin role management
- ✅ Extended profile information
- ✅ Profile search
- ✅ Profile deletion

## Key Features

### Test Utilities (`setup.ts`)

```typescript
// Create test user
const { userId } = await createTestUser(email, password, username);

// Sign in
const { client, userId } = await signInTestUser(email, password);

// Create test data
const postId = await createTestPost(authorId);
const commentId = await createTestComment(postId, authorId);

// Generate unique identifiers
const email = generateTestEmail('prefix');
const username = generateTestUsername('prefix');

// Cleanup (automatic in afterEach)
await cleanupTestData();
```

### Supabase Clients

```typescript
// Regular client (respects RLS)
const client = getTestClient();

// Service role client (bypasses RLS, for setup/cleanup only)
const serviceClient = getServiceRoleClient();
```

## Best Practices

1. **Isolation**: Each test creates and cleans up its own data
2. **Unique Data**: Use `generateTestEmail()` and `generateTestUsername()` to avoid conflicts
3. **Service Role**: Only use service role client for setup/cleanup, not for testing API behavior
4. **Cleanup**: Always clean up resources in `afterEach` hooks
5. **Descriptive Tests**: Use clear, descriptive test names

## Environment Variables

Required in `.env.test`:

```bash
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For test setup/cleanup

# Optional
VITE_BETTER_AUTH_URL=http://localhost:5173/api/auth
NODE_ENV=test
```

## Common Commands

```bash
# Run all integration tests
npm run test:integration

# Watch mode (auto-rerun on changes)
npm run test:integration:watch

# Run specific test file
npx vitest run src/tests/integration/auth.test.ts

# Run specific test by name
npx vitest run -t "should successfully sign in"

# Run with coverage
npm run test:coverage -- src/tests/integration

# Run all tests (unit + integration + e2e)
npm run test:all
```

## Troubleshooting

### Missing credentials error
- Ensure `.env.test` exists and has valid values
- Check file is in project root, not in this directory

### Table does not exist error
- Run migrations: `npm run migrate`
- Verify test database has all tables

### RLS policy errors
- Use `getServiceRoleClient()` for operations that should bypass RLS
- For testing actual API behavior, use `getTestClient()`

### Tests leaving behind data
- Check `afterEach` hooks are running
- Verify `cleanupTestData()` is called
- Check for test failures that skip cleanup

### Timeout errors
- Increase timeout in `vitest.config.ts`
- Check database connection
- Verify Supabase project is running

## Documentation

For detailed information, see:
- **[INTEGRATION_TESTS_GUIDE.md](../../../INTEGRATION_TESTS_GUIDE.md)** - Complete guide with examples
- **[.env.test.example](../../../.env.test.example)** - Environment setup template

## Security

⚠️ **IMPORTANT**:
- Never commit `.env.test` to git
- Never use service role key in production code
- Only use service role in tests for setup/cleanup
- Use separate test database/project

## Contributing

When adding new tests:

1. Follow existing patterns in test files
2. Use utilities from `setup.ts`
3. Add proper cleanup in `afterEach`
4. Test both success and failure paths
5. Update this README with test count

---

**Total Tests**: 86+
**Last Updated**: 2025-10-30
