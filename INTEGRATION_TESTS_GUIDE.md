# Integration Tests Guide

This guide explains how to set up and run integration tests for the Pythoughts blog platform.

## Overview

The integration test suite provides comprehensive testing of API endpoints and database operations including:

- **Authentication** - Sign up, sign in, sign out, session management
- **Blog Posts** - CRUD operations, publishing workflow, authorization
- **Comments** - Create, reply (threaded), update, delete comments
- **User Profiles** - Get, update, statistics management

## Test Files

```
src/tests/integration/
├── setup.ts           # Test utilities and fixtures
├── auth.test.ts       # Authentication flow tests (11 tests)
├── blogs.test.ts      # Blog CRUD tests (28 tests)
├── comments.test.ts   # Comments system tests (24 tests)
└── profiles.test.ts   # User profile tests (23 tests)
```

**Total: 86+ integration tests** covering all critical API paths.

## Setup

### 1. Environment Configuration

Create a `.env.test` file in the project root:

```bash
cp .env.test.example .env.test
```

Fill in your test environment variables:

```bash
# Required
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional
VITE_BETTER_AUTH_URL=http://localhost:5173/api/auth
NODE_ENV=test
```

### 2. Test Database Setup

**Option A: Separate Test Project (Recommended)**

1. Create a new Supabase project specifically for testing
2. Run all migrations on the test project
3. Use the test project's credentials in `.env.test`

**Option B: Isolated Test Database**

1. Create a separate database in your existing Supabase project
2. Run migrations on the test database
3. Update `DATABASE_URL` in `.env.test` to point to test DB

### 3. Run Migrations

Ensure your test database has all tables and schemas:

```bash
npm run migrate
```

## Running Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Watch Mode (Re-run on file changes)

```bash
npm run test:integration:watch
```

### Run Specific Test File

```bash
npx vitest run src/tests/integration/auth.test.ts
```

### Run All Tests (Unit + Integration + E2E)

```bash
npm run test:all
```

### With Coverage

```bash
npm run test:coverage -- src/tests/integration
```

## Test Structure

### Setup & Teardown

All tests use the following lifecycle:

```typescript
beforeAll()     // Initialize Supabase clients
beforeEach()    // Create test users/data
afterEach()     // Clean up test data, sign out
afterAll()      // Final cleanup
```

### Test Utilities

The `setup.ts` file provides helper functions:

#### User Management

```typescript
// Create a test user with profile
const { userId } = await createTestUser(email, password, username);

// Sign in and get authenticated client
const { client, userId } = await signInTestUser(email, password);

// Generate unique test emails/usernames
const email = generateTestEmail('prefix');
const username = generateTestUsername('prefix');
```

#### Data Creation

```typescript
// Create a test blog post
const postId = await createTestPost(authorId, { title: 'Custom Title' });

// Create a test comment
const commentId = await createTestComment(postId, authorId, { content: 'Test' });
```

#### Cleanup

```typescript
// Clean up all created resources
await cleanupTestData();
```

### Supabase Clients

```typescript
// Regular client (uses anon key, respects RLS)
const client = getTestClient();

// Service role client (bypasses RLS, for setup/cleanup)
const serviceClient = getServiceRoleClient();
```

## Test Coverage

### Authentication Tests (auth.test.ts)

**Test Suites:**
- User Registration (Sign Up) - 4 tests
- User Sign In - 4 tests
- User Sign Out - 2 tests
- Session Verification - 2 tests
- Password Reset Flow - 2 tests
- Edge Cases and Error Handling - 4 tests

**Key Scenarios:**
- ✅ Successful registration
- ✅ Password strength validation
- ✅ Duplicate email rejection
- ✅ Invalid credentials handling
- ✅ Session persistence
- ✅ Sign out and session cleanup

### Blog CRUD Tests (blogs.test.ts)

**Test Suites:**
- Create Blog Post - 5 tests
- Read Blog Posts - 7 tests
- Update Blog Posts - 5 tests
- Delete Blog Posts - 3 tests
- Post Statistics and Counters - 2 tests
- Edge Cases - 3 tests

**Key Scenarios:**
- ✅ Create with all fields
- ✅ Draft vs published workflow
- ✅ Read single/multiple posts
- ✅ Filter by category, status
- ✅ Update multiple fields
- ✅ Cascade delete related data
- ✅ Special characters handling

### Comments Tests (comments.test.ts)

**Test Suites:**
- Create Comments - 4 tests
- Reply to Comments (Threaded) - 4 tests
- Update Comments - 3 tests
- Delete Comments - 3 tests
- Comment Pinning - 2 tests
- List Comments for Post - 4 tests
- Edge Cases - 3 tests

**Key Scenarios:**
- ✅ Create top-level comments
- ✅ Nested replies (depth 1, 2)
- ✅ Update comment content
- ✅ Soft vs hard delete
- ✅ Pin/unpin comments
- ✅ Filter deleted comments
- ✅ Long content handling

### Profile Tests (profiles.test.ts)

**Test Suites:**
- Get Profile - 4 tests
- Update Profile - 6 tests
- Admin Status - 2 tests
- Profile Extended Information - 1 test
- List Profiles - 2 tests
- Profile Statistics - 1 test
- Edge Cases - 5 tests
- Profile Deletion - 1 test

**Key Scenarios:**
- ✅ Retrieve by ID/username
- ✅ Update bio, avatar, username
- ✅ Unique username enforcement
- ✅ Admin role management
- ✅ Extended profile data
- ✅ Search by username pattern
- ✅ Profile deletion

## Best Practices

### Writing Integration Tests

1. **Isolation**: Each test should be independent
   ```typescript
   beforeEach(async () => {
     // Create fresh test data
   });

   afterEach(async () => {
     // Clean up test data
   });
   ```

2. **Descriptive Names**: Use clear test descriptions
   ```typescript
   it('should reject sign in with wrong password', async () => {
     // Test implementation
   });
   ```

3. **Test Both Success and Failure Paths**
   ```typescript
   it('should successfully create a post', ...);
   it('should reject post creation without author_id', ...);
   ```

4. **Use Service Role Sparingly**
   - Only for setup/cleanup
   - Test actual API with anon client when possible

5. **Clean Up Resources**
   - Always clean up created data
   - Track created IDs for cleanup

### Debugging Tests

Enable verbose logging:
```bash
DEBUG=* npm run test:integration
```

Run single test:
```bash
npx vitest run src/tests/integration/auth.test.ts -t "should successfully sign in"
```

Watch mode for debugging:
```bash
npm run test:integration:watch
```

## Common Issues

### Issue: Tests failing with "Missing Supabase credentials"

**Solution**: Ensure `.env.test` exists with valid credentials:
```bash
cat .env.test  # Verify file exists and has correct values
```

### Issue: Tests failing with "Table does not exist"

**Solution**: Run migrations on test database:
```bash
npm run migrate
```

### Issue: Tests leaving behind data

**Solution**: Check `afterEach` and `afterAll` hooks are running:
```typescript
afterEach(async () => {
  await cleanupTestData();  // Ensure this is called
});
```

### Issue: RLS policy errors

**Solution**: Tests requiring service role operations should use `getServiceRoleClient()`:
```typescript
const serviceClient = getServiceRoleClient();  // Bypasses RLS
```

### Issue: Timeout errors

**Solution**: Increase test timeout in vitest.config.ts:
```typescript
export default defineConfig({
  test: {
    testTimeout: 10000,  // 10 seconds
  },
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}
        run: npm run test:integration
```

## Security Notes

### ⚠️ CRITICAL: Service Role Key Security

1. **NEVER** commit `.env.test` to git (it's in `.gitignore`)
2. **NEVER** use service role key in production code
3. **ONLY** use service role in tests for setup/cleanup
4. Store service role key in CI/CD secrets, never in code

### Test Data Isolation

- Use unique email/username generators to avoid conflicts
- Clean up all test data after tests complete
- Use separate test database/project to avoid affecting production

## Performance Tips

1. **Parallel Execution**: Vitest runs tests in parallel by default
2. **Database Pooling**: Reuse Supabase clients across tests
3. **Selective Testing**: Run only changed test files during development
4. **Mock External Services**: Mock third-party APIs (email, etc.)

## Extending Tests

### Adding New Test File

1. Create file in `src/tests/integration/`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { getTestClient, cleanupTestData } from './setup';

   describe('New Feature Tests', () => {
     // Your tests here
   });
   ```

2. Import setup utilities
3. Follow existing patterns for setup/teardown
4. Run tests: `npm run test:integration`

### Adding Test Utilities

Edit `src/tests/integration/setup.ts`:

```typescript
export async function createTestFeature(...) {
  const client = getServiceRoleClient();
  // Implementation
  createdResources.featureIds.push(id);
  return id;
}
```

## Reporting

### Generate Coverage Report

```bash
npm run test:coverage -- src/tests/integration
```

View HTML report:
```bash
open coverage/index.html
```

### Test Results Summary

After running tests, check summary:
- ✅ Tests passed
- ❌ Tests failed
- ⏭️ Tests skipped
- ⏱️ Duration
- 📊 Coverage %

## Support

For issues or questions:
- Check existing tests for examples
- Review Supabase documentation
- Check vitest documentation
- Open an issue in the project repository

---

**Last Updated:** 2025-10-30
**Test Suite Version:** 1.0
**Total Tests:** 86+
