# Code Quality & CI/CD Documentation

This document outlines the code quality measures, pre-commit hooks, and CI/CD pipelines implemented for the Pythoughts project.

## Table of Contents

- [Pre-commit Hooks](#pre-commit-hooks)
- [CI/CD Pipeline](#cicd-pipeline)
- [Code Quality Tools](#code-quality-tools)
- [Commit Message Convention](#commit-message-convention)
- [Testing Strategy](#testing-strategy)
- [Troubleshooting](#troubleshooting)

---

## Pre-commit Hooks

Pre-commit hooks run automatically before each commit to ensure code quality and prevent common issues from entering the codebase.

### Setup

Pre-commit hooks are automatically configured when you run:

```bash
npm install
```

The `prepare` script in `package.json` initializes Husky hooks automatically.

### What Runs on Pre-commit

The following checks run automatically on staged files:

#### 1. **Lint-staged** (Code Quality)

- **ESLint**: Lints TypeScript/JavaScript files with auto-fix
  - Enforces React hooks rules
  - Prevents unused variables (errors)
  - Warns on `any` types
  - Max warnings: 0 (all warnings must be fixed)

- **Prettier**: Formats code to match project style
  - Applies to `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.scss`, `.md`
  - Auto-fixes formatting issues

#### 2. **TypeScript Type Checking**

- Runs `tsc --noEmit` to verify no type errors
- Checks all TypeScript files in the project
- **Blocks commit if type errors exist**

#### 3. **Console Statement Detection**

- Warns about `console.log`, `console.warn`, etc.
- Does NOT block commits (warning only)
- Helps identify debug statements before production

### Lint-staged Configuration

Defined in `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix --max-warnings 0",
    "prettier --write"
  ],
  "*.{js,jsx}": [
    "eslint --fix --max-warnings 0",
    "prettier --write"
  ],
  "*.{json,css,scss,md}": [
    "prettier --write"
  ]
}
```

### Bypassing Pre-commit Hooks

**⚠️ Not Recommended** - Only use in emergency situations:

```bash
git commit --no-verify -m "Your message"
```

---

## Commit Message Convention

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring (no feature or bug fix)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system or dependency changes
- **ci**: CI/CD configuration changes
- **chore**: Maintenance tasks
- **revert**: Reverting a previous commit

### Examples

```bash
# Good commits
feat(auth): add two-factor authentication
fix(blog): resolve markdown rendering issue with code blocks
docs: update README with pre-commit hook instructions
refactor(api): simplify user authentication flow
test(editor): add unit tests for collaboration features

# Bad commits (will be rejected)
"fixed bug"
"WIP"
"update stuff"
"asdf"
```

### Commit Message Validation

The `commit-msg` hook validates commit messages automatically. If invalid, you'll see:

```
ERROR: Invalid commit message format!

Commit message must follow the Conventional Commits specification:
  <type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
```

---

## CI/CD Pipeline

### Overview

The project has two main CI/CD workflows:

1. **`code-quality.yml`** - Comprehensive code quality checks
2. **`ci.yml`** - Existing integration tests and E2E tests

### Code Quality Workflow

Runs on:

- Every push to `main` or `develop`
- Every pull request to `main` or `develop`

#### Jobs

##### 1. Lint & Type Check (10 min timeout)

- ✅ **Prettier format check** - Ensures code is formatted
- ✅ **ESLint** - Enforces code quality rules
- ✅ **TypeScript type checking** - Verifies no type errors
- **Fail Condition**: Any check fails

##### 2. Unit Tests (15 min timeout)

- ✅ Runs all unit tests with Vitest
- ✅ Generates coverage report
- ✅ Enforces 70% coverage threshold
- ✅ Uploads coverage to Codecov
- **Fail Condition**: Tests fail or coverage < 70%

##### 3. Build Verification (20 min timeout)

Matrix strategy builds both:

- ✅ **Vite build** - SPA mode
- ✅ **Next.js build** - SSG/ISR mode
- ✅ Verifies build artifacts exist
- ✅ Analyzes bundle size
- **Fail Condition**: Build fails or missing artifacts

##### 4. Security Scan (10 min timeout)

- ⚠️ **npm audit** - Checks for vulnerable dependencies
- ⚠️ **Snyk** - Advanced security scanning (requires `SNYK_TOKEN`)
- **Fail Condition**: Continue on error (warnings only)

##### 5. Commit Message Validation (PRs only)

- ✅ Validates all commits follow Conventional Commits
- ✅ Runs only on pull requests
- **Fail Condition**: Invalid commit message format

##### 6. Quality Gate (Final Check)

- ✅ Ensures all previous jobs passed
- ✅ Posts PR comment with results
- **Fail Condition**: Any required job fails

### Required Secrets

Add these to GitHub repository settings:

```
CODECOV_TOKEN       # Optional - for coverage reporting
SNYK_TOKEN          # Optional - for advanced security scanning
```

### Pipeline Behavior

#### ✅ Success Criteria

All of the following must pass:

- No ESLint errors or warnings
- No TypeScript type errors
- Code properly formatted (Prettier)
- All unit tests pass
- Test coverage ≥ 70%
- Both Vite and Next.js builds succeed
- Commit messages follow convention (PRs only)

#### ❌ Failure Conditions

Pipeline fails if:

- ESLint has errors or warnings (max-warnings: 0)
- TypeScript compilation errors
- Unit tests fail
- Coverage below 70%
- Vite or Next.js build fails
- Invalid commit message format

#### Branch Protection

Recommended settings for `main` branch:

```yaml
- Require status checks to pass before merging
  ✅ Lint & Type Check
  ✅ Unit Tests
  ✅ Build Verification
  ✅ Quality Gate

- Require branches to be up to date
- Require linear history
- Include administrators
```

---

## Code Quality Tools

### ESLint

**Config**: `eslint.config.js` (ESLint 9 flat config)

**Rules**:

- React hooks rules enforced
- Unused variables: `warn` (with `_` prefix exception)
- Explicit `any`: `warn` (discouraged)
- React Refresh: components must be properly exported

**Run manually**:

```bash
npm run lint           # Check for issues
npm run lint -- --fix  # Auto-fix issues
```

### Prettier

**Config**: `.prettierrc`

**Settings**:

- Single quotes
- Semicolons
- Tab width: 2 spaces
- Print width: 100 characters
- Trailing commas: ES5
- LF line endings

**Run manually**:

```bash
npm run format        # Format all files
npm run format:check  # Check formatting without changes
```

### TypeScript

**Config**: `tsconfig.app.json`

**Strict mode enabled**:

- `noUnusedLocals`: true
- `noUnusedParameters`: true
- `noFallthroughCasesInSwitch`: true

**Run manually**:

```bash
npm run typecheck
```

---

## Testing Strategy

### Unit Tests (Vitest)

**Location**: `src/**/*.test.ts(x)`

**Coverage Requirements**:

- **Minimum**: 70% (enforced by CI/CD)
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

**Run tests**:

```bash
npm run test           # Watch mode
npm run test:unit      # Run once
npm run test:coverage  # With coverage report
```

### E2E Tests (Playwright)

**Location**: `tests/e2e/`

**Browsers**: Chrome, Firefox, Safari, Mobile viewports

**Run E2E tests**:

```bash
npm run test:e2e           # Headless
npm run test:e2e:ui        # Interactive UI
npm run test:e2e:headed    # With browser window
npm run test:e2e:debug     # Debug mode
```

---

## Troubleshooting

### Pre-commit Hook Issues

#### Issue: "Husky hook not running"

**Solution**:

```bash
npm run prepare  # Re-initialize Husky
```

#### Issue: "lint-staged not found"

**Solution**:

```bash
rm -rf node_modules
npm install --legacy-peer-deps
```

#### Issue: "TypeScript errors in pre-commit"

**Solution**:

```bash
npm run typecheck  # See all errors
# Fix errors, then commit again
```

#### Issue: "Prettier format conflicts"

**Solution**:

```bash
npm run format     # Auto-format all files
git add .          # Stage formatted files
git commit         # Retry commit
```

### CI/CD Pipeline Issues

#### Issue: "Build fails in CI but works locally"

**Common causes**:

- Missing environment variables in GitHub secrets
- Node version mismatch (CI uses Node 20)
- Dependency version conflicts

**Solution**:

```bash
# Test with same Node version as CI
nvm use 20
npm ci --legacy-peer-deps
npm run build:all
```

#### Issue: "ESLint fails with max-warnings"

**Solution**:

```bash
npm run lint  # See all warnings
# Fix warnings or update rules in eslint.config.js
```

#### Issue: "Coverage below threshold"

**Solution**:

```bash
npm run test:coverage  # Generate coverage report
# Add tests for uncovered files
# Coverage report: coverage/index.html
```

### Commit Message Validation Issues

#### Issue: "Invalid commit message format"

**Solution**:

```bash
# Amend your commit message
git commit --amend

# Use proper format:
feat(scope): description
fix(auth): resolve login issue
docs: update README
```

#### Issue: "Bypass validation temporarily"

**⚠️ Not recommended**:

```bash
git commit --no-verify -m "Your message"
```

---

## Performance Optimization Tips

### Faster Pre-commit Checks

1. **Only commit relevant files**:

   ```bash
   git add src/components/MyComponent.tsx
   # Faster than: git add .
   ```

2. **Skip type checking if confident**:
   ```bash
   # Edit .husky/pre-commit and comment out typecheck
   # NOT RECOMMENDED for production
   ```

### Faster CI/CD

1. **Use dependency caching** (already enabled)
2. **Run jobs in parallel** (already implemented)
3. **Matrix builds** for Vite + Next.js (already implemented)

---

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## Quick Reference

### Common Commands

```bash
# Pre-commit checks (manual)
npm run format                # Format all files
npm run lint                  # Lint all files
npm run typecheck             # Type check all files

# Testing
npm run test:unit             # Run unit tests
npm run test:coverage         # Generate coverage
npm run test:e2e              # Run E2E tests

# Building
npm run build                 # Build Vite
npm run build:next            # Build Next.js
npm run build:all             # Build both

# Git hooks
npm run prepare               # Initialize Husky
git commit --no-verify        # Skip hooks (emergency only)
```

### File Structure

```
.husky/
├── _/                       # Husky internals
├── pre-commit               # Pre-commit hook script
└── commit-msg               # Commit message validation

.github/
└── workflows/
    ├── code-quality.yml     # Code quality checks
    ├── ci.yml               # Main CI pipeline
    ├── performance.yml      # Performance tests
    ├── deploy.yml           # Deployment
    └── pr-preview.yml       # PR preview environments

.prettierrc                  # Prettier configuration
.prettierignore              # Prettier ignore patterns
eslint.config.js             # ESLint 9 flat config
package.json                 # Scripts and lint-staged config
```

---

**Last Updated**: October 2025
**Maintainer**: Pythoughts Team
