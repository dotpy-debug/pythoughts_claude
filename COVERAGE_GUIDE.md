# Coverage Guide

Comprehensive guide to test coverage in the Pythoughts project using Vitest and Codecov.

## Table of Contents

- [Overview](#overview)
- [Running Coverage Locally](#running-coverage-locally)
- [Understanding Coverage Reports](#understanding-coverage-reports)
- [Coverage Thresholds](#coverage-thresholds)
- [Best Practices](#best-practices)
- [Interpreting Codecov Reports](#interpreting-codecov-reports)
- [Improving Coverage](#improving-coverage)
- [Troubleshooting](#troubleshooting)

## Overview

This project uses a comprehensive coverage tracking system:

- **Vitest** with V8 coverage provider for fast, accurate coverage
- **Codecov** for tracking coverage trends and PR analysis
- **70% minimum coverage** enforced for all metrics (lines, functions, branches, statements)
- **Automated CI/CD** coverage checks on every PR

### What is Code Coverage?

Code coverage measures how much of your code is executed during tests. It includes:

- **Line Coverage**: Percentage of code lines executed
- **Function Coverage**: Percentage of functions called
- **Branch Coverage**: Percentage of conditional branches taken
- **Statement Coverage**: Percentage of statements executed

## Running Coverage Locally

### Basic Coverage Report

Generate a coverage report for all tests:

```bash
npm run test:coverage
```

This will:
1. Run all unit tests
2. Generate coverage reports in multiple formats
3. Display a summary in the terminal
4. Create an HTML report in `coverage/index.html`

### View Coverage in Browser

Open the HTML report:

```bash
npm run coverage:view
```

This opens the interactive coverage report in your browser, showing:
- File-by-file coverage breakdown
- Line-by-line execution highlights
- Uncovered code sections in red
- Covered code in green

### Watch Mode with Coverage

Run tests in watch mode with coverage updates:

```bash
npm run test:watch
```

This is useful during development but note that coverage calculation adds overhead.

### Coverage for Specific Files

Test coverage for a specific file or directory:

```bash
# Coverage for a specific component
npx vitest run src/components/auth/LoginForm.test.tsx --coverage

# Coverage for all auth components
npx vitest run src/components/auth --coverage

# Coverage for services
npx vitest run src/services --coverage
```

## Understanding Coverage Reports

### Terminal Output

After running `npm run test:coverage`, you'll see:

```
File                         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------------|---------|----------|---------|---------|------------------
src/components/auth          |   85.71 |    83.33 |   88.88 |   85.71 | 45-48
  LoginForm.tsx              |   92.30 |    87.50 |   90.00 |   92.30 | 102
  RegisterForm.tsx           |   78.57 |    75.00 |   87.50 |   78.57 | 45-48,56
src/services                 |   72.41 |    68.42 |   76.92 |   72.41 |
  blogService.ts             |   80.00 |    75.00 |   83.33 |   80.00 | 67-70
  authService.ts             |   65.00 |    62.50 |   71.42 |   65.00 | 34-38,89-92
```

### HTML Report Structure

The HTML report (`coverage/index.html`) provides:

1. **Overview Dashboard**: Total coverage percentages
2. **File Browser**: Navigate through directory structure
3. **File View**: Line-by-line coverage with highlights:
   - ✅ Green: Covered lines
   - ❌ Red: Uncovered lines
   - 🟡 Yellow: Partially covered branches

4. **Execution Counts**: Number next to each line shows execution count

### LCOV Report

The `coverage/lcov.info` file is used by Codecov and contains detailed coverage data. You don't need to read this file directly, but tools like IDE extensions use it.

## Coverage Thresholds

### Current Thresholds

The project enforces **70% minimum coverage** for:

- Line coverage: 70%
- Function coverage: 70%
- Branch coverage: 70%
- Statement coverage: 70%

These are configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70,
  }
}
```

### When Thresholds Fail

If coverage drops below 70%, the test run will fail:

```
ERROR: Coverage for lines (68.5%) does not meet global threshold (70%)
```

To fix:
1. Add tests for uncovered code
2. Or update thresholds if intentionally lowering coverage (requires team discussion)

### Codecov Status Checks

Codecov enforces additional rules (configured in `codecov.yml`):

- **Project Coverage**: Total coverage must be ≥70% (allows 2% drop)
- **Patch Coverage**: New code in PRs must be ≥70% covered (allows 5% drop)

## Best Practices

### 1. Test Business Logic First

Focus coverage on critical business logic:

```typescript
// High priority for coverage
src/services/          # Business logic
src/lib/auth.ts        # Authentication
src/actions/           # Server actions
```

Lower priority:
```typescript
// Lower priority for coverage
src/components/ui/     # UI components (visual testing more important)
src/types/            # Type definitions (TypeScript handles this)
```

### 2. Don't Chase 100% Coverage

**70% is the goal, not 100%.**

Some code doesn't need tests:
- Simple UI components without logic
- Type definitions and interfaces
- Configuration files
- Error boundaries (hard to test, better with E2E)

### 3. Write Meaningful Tests

Don't write tests just to increase coverage:

```typescript
// ❌ Bad: Meaningless coverage
test('component renders', () => {
  render(<MyComponent />);
  expect(true).toBe(true);
});

// ✅ Good: Tests behavior
test('component shows error message when validation fails', () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Invalid input')).toBeInTheDocument();
});
```

### 4. Cover Edge Cases

Ensure branch coverage by testing all paths:

```typescript
// Function with branches
function calculateDiscount(price: number, isStudent: boolean): number {
  if (isStudent) {
    return price * 0.8;
  }
  return price;
}

// ✅ Test both branches
test('applies student discount', () => {
  expect(calculateDiscount(100, true)).toBe(80);
});

test('no discount for non-students', () => {
  expect(calculateDiscount(100, false)).toBe(100);
});
```

### 5. Use Coverage to Find Gaps

Review the HTML report to identify:
- Uncovered error handling
- Untested edge cases
- Dead code that can be removed

### 6. Exclude Generated and Test Files

Already configured in `vitest.config.ts`:

```typescript
exclude: [
  'node_modules/',
  'src/test/',
  '**/*.test.{ts,tsx}',     // Test files themselves
  '**/*.config.*',          // Config files
  'dist/',                  // Build output
  '.next/',                 // Next.js build
  'server/',                // Collaboration server (separate testing)
  'scripts/',               # Build scripts
]
```

## Interpreting Codecov Reports

### Codecov Dashboard

Visit the Codecov dashboard for your repository to see:

1. **Coverage Trend Graph**: Coverage over time
2. **Sunburst Chart**: Visual breakdown of coverage by directory
3. **File Tree**: Coverage for each file
4. **Commit Coverage**: Coverage for each commit

### PR Comments

On pull requests, Codecov posts a comment showing:

```markdown
## Codecov Report
Coverage: 72.5% (+1.2%) compared to base
Files with Coverage Changes:
- src/components/NewFeature.tsx: 85% (+85%)
- src/services/blogService.ts: 78% (-2%)
```

### Coverage Status Checks

Codecov adds GitHub status checks:

- ✅ **project/coverage**: Overall project coverage meets threshold
- ✅ **patch/coverage**: New code in PR meets threshold
- ❌ If either fails, the PR is blocked (unless you override)

### Understanding the Diff View

Codecov highlights coverage changes in the GitHub "Files changed" view:

- 🟢 Green highlight: New line covered by tests
- 🔴 Red highlight: New line NOT covered by tests
- No highlight: Existing code (unchanged coverage)

## Improving Coverage

### 1. Identify Low-Coverage Areas

Check the HTML report or Codecov dashboard:

```bash
npm run test:coverage
npm run coverage:view
```

Look for files with <70% coverage.

### 2. Add Tests for Uncovered Lines

Click on a file in the HTML report to see uncovered lines:

```typescript
// coverage/index.html shows line 45-48 are uncovered
// File: src/components/auth/RegisterForm.tsx

45: if (!validateEmail(email)) {
46:   setError('Invalid email');
47:   return;
48: }
```

Add a test:

```typescript
test('shows error for invalid email', () => {
  render(<RegisterForm />);
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'invalid-email' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByText('Invalid email')).toBeInTheDocument();
});
```

### 3. Cover Error Paths

Many untested lines are error handling:

```typescript
try {
  await createPost(data);
} catch (error) {
  // This line might be uncovered
  console.error('Failed to create post:', error);
  showErrorToast('Failed to create post');
}
```

Test the error case:

```typescript
test('handles post creation failure', async () => {
  // Mock the service to throw an error
  vi.mocked(createPost).mockRejectedValue(new Error('Network error'));

  render(<CreatePostForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  await waitFor(() => {
    expect(screen.getByText('Failed to create post')).toBeInTheDocument();
  });
});
```

### 4. Test All Branches

Use coverage to find untested conditional branches:

```typescript
// Both branches need testing
const status = user?.isAdmin ? 'admin' : 'user';
```

### 5. Remove Dead Code

If coverage reveals code that's never executed, consider removing it:

```typescript
// If coverage shows this is never reached, remove it
if (process.env.NODE_ENV === 'development' && false) {
  console.log('Debug info');
}
```

## Troubleshooting

### Coverage is Inaccurate

**Issue**: Coverage report shows 100% but you know some code isn't tested.

**Solutions**:
1. Clear coverage cache: `rm -rf coverage node_modules/.vite`
2. Run fresh: `npm run test:coverage`
3. Check if files are being excluded in `vitest.config.ts`

### Tests Pass but Coverage Fails Threshold

**Issue**: All tests pass but CI fails on coverage.

**Solutions**:
1. Run locally: `npm run test:coverage`
2. Check which metrics failed (lines, branches, functions, statements)
3. Add tests to cover the gaps
4. Ensure you're testing all conditional branches

### Coverage is Lower in CI than Locally

**Issue**: Coverage is 75% locally but 68% in GitHub Actions.

**Solutions**:
1. Ensure you've committed all test files
2. Check if `.gitignore` is excluding test files
3. Verify CI runs the same command: `npm run test:coverage`
4. Check for environment-specific code that only runs in CI

### Codecov Upload Fails

**Issue**: GitHub Actions shows "Failed to upload coverage to Codecov".

**Solutions**:
1. Check `CODECOV_TOKEN` is set in GitHub Secrets
2. Verify `coverage/lcov.info` is generated: Check artifacts
3. Review GitHub Actions logs for specific error
4. See `.github/CODECOV_SETUP.md` for full setup guide

### Excluded Files Still Showing

**Issue**: Config files appear in coverage report.

**Solutions**:
1. Update `vitest.config.ts` exclude patterns
2. Add to `codecov.yml` ignore section
3. Ensure patterns match your file structure
4. Use glob patterns: `**/*.config.ts` not `*.config.ts`

### Slow Test Runs with Coverage

**Issue**: Tests with coverage take too long.

**Solutions**:
1. Run without coverage during development: `npm run test:unit`
2. Only run coverage before commits or in CI
3. Use `test.include` patterns to test specific areas
4. Consider splitting large test suites

### Coverage Differs Between Developers

**Issue**: Different developers see different coverage numbers.

**Solutions**:
1. Ensure everyone uses the same Node version (20+)
2. Clear and reinstall dependencies: `rm -rf node_modules && npm ci`
3. Use consistent npm scripts: `npm run test:coverage`
4. Check for environment-specific test skipping

## Advanced Topics

### Integration Test Coverage

Currently, unit tests are tracked. To add integration test coverage:

1. Run integration tests with coverage:
   ```bash
   npm run test:integration -- --coverage
   ```

2. Merge with unit test coverage using Codecov flags

### Component Coverage

Track coverage by feature area (configured in `codecov.yml`):

```yaml
component_management:
  individual_components:
    - component_id: auth_system
      paths:
        - src/lib/auth.ts
        - src/components/auth/**
```

### Custom Coverage Reports

Generate custom reports:

```bash
# JSON report for programmatic access
npx vitest run --coverage --reporter=json

# Coverage for changed files only (Git)
npx vitest run --coverage --changed
```

## Resources

- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [Codecov Documentation](https://docs.codecov.com)
- [V8 Coverage Provider](https://vitest.dev/guide/coverage.html#coverage-providers)
- [Understanding Branch Coverage](https://en.wikipedia.org/wiki/Code_coverage#Branch_coverage)

## Questions?

For questions about coverage:
1. Check this guide first
2. Review `.github/CODECOV_SETUP.md` for Codecov-specific issues
3. Open an issue in the repository
4. Consult the team in Slack/Discord
