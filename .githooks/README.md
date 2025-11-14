# 🚀 Professional Git Hooks & Smart CI/CD System

A comprehensive, AI-powered Git hooks system with intelligent change detection and optimized CI/CD pipelines for the Pythoughts project.

## 🎯 Features

### Smart Pre-Commit Hooks
- ✅ **ESLint** - Code quality and style enforcement
- ✅ **TypeScript** - Compile-time type checking
- ✅ **Secret Scanning** - Prevent accidental credential commits
- ✅ **Parallel Execution** - Fast feedback (typically <5s)
- ✅ **AI Error Reporting** - Structured error reports for automated fixing

### Intelligent Pre-Push Hooks
- 📊 **Change Analysis** - Detects what actually changed
- 🧪 **Smart Testing** - Only runs relevant tests
- 💰 **Cost Optimization** - Skips unnecessary CI jobs
- ⏱️ **Time Savings** - Reduces CI time by 30-50%
- 📈 **Metrics** - Shows estimated savings before push

### Optimized CI/CD Pipeline
- 🔍 **Conditional Jobs** - Jobs run only when needed
- 🗄️ **Database Tests** - Skipped when no DB changes
- 💾 **Redis Tests** - Skipped when no cache changes
- 🎭 **E2E Tests** - Skipped for backend-only changes
- 📊 **Pipeline Summary** - Shows optimizations and savings

## 📁 Project Structure

```
.githooks/
├── config/
│   ├── hook-config.json       # Hook configuration
│   └── change-rules.yml       # Change detection rules
├── scripts/
│   ├── pre-commit-check.ts    # Pre-commit hook logic
│   ├── pre-push-check.ts      # Pre-push hook logic
│   ├── analyze-changes.ts     # Change analysis engine
│   └── utils/
│       ├── file-detector.ts   # Pattern matching utilities
│       ├── git-helper.ts      # Git operations
│       └── error-reporter.ts  # AI error reporting
├── types/
│   ├── error-report.ts        # Error report types
│   └── change-analysis.ts     # Change analysis types
└── reports/                   # Generated error reports (gitignored)
```

## 🚀 Quick Start

### Installation

The hooks are automatically installed when you run:

```bash
npm install
```

This triggers the `prepare` script which runs `husky install`.

### Verification

Test that hooks are working:

```bash
# Test pre-commit
git add .
git commit -m "test"  # Should run linting and type checking

# Test pre-push
git push  # Should analyze changes and run smart tests
```

### Bypass Hooks (Emergency Use Only)

```bash
# Skip pre-commit
git commit --no-verify -m "emergency fix"

# Skip pre-push
git push --no-verify
```

**⚠️ Warning:** Only use `--no-verify` in genuine emergencies. It bypasses all safety checks.

## 📊 Change Analysis System

The system categorizes file changes and determines optimal testing strategy:

### File Categories

| Category | Examples | Impact |
|----------|----------|--------|
| **Documentation** | `*.md`, `docs/**` | Skip all tests |
| **Code** | `src/**/*.ts`, `app/**/*.tsx` | Run unit tests |
| **Database** | `migrations/**`, `db/schema.ts` | Run DB tests |
| **Cache** | `redis/**`, `lib/cache.ts` | Run cache tests |
| **Infrastructure** | `Dockerfile`, `.github/workflows/**` | Full build |
| **Dependencies** | `package.json`, `package-lock.json` | Full build |

### Build Scopes

- **`none`**: Documentation only → Skip entire build
- **`minimal`**: Config/styles only → Quick build
- **`partial`**: < 10 code files → Partial tests
- **`full`**: Infrastructure/DB/API → All tests

### Skip Rules

Tests are intelligently skipped based on changes:

```yaml
# Example: Database tests
skipDatabase: true when:
  - Only documentation changed
  - Only styles changed
  - No database files or imports detected

skipDatabase: false when:
  - Database files changed
  - Code imports database libraries
  - API routes changed
```

## 🤖 AI Error Reporting

When hooks fail, structured error reports are generated:

```json
{
  "id": "ERR-1234567890-abc123",
  "stage": "pre-commit",
  "diagnostics": [
    {
      "message": "Expected semicolon",
      "file": "src/components/Button.tsx",
      "line": 42,
      "column": 15,
      "severity": "error",
      "category": "lint",
      "ruleId": "semi",
      "suggestedFix": "Add semicolon at end of line"
    }
  ],
  "gitContext": { "branch": "feature/new-button", ... },
  "environment": { "nodeVersion": "20.10.0", ... },
  "howToReproduce": [ "git checkout feature/new-button", ... ]
}
```

These reports can be consumed by AI agents for automated fixing.

## ⚙️ Configuration

### Hook Configuration

Edit `.githooks/config/hook-config.json`:

```json
{
  "preCommit": {
    "enabled": true,
    "checks": {
      "lint": { "enabled": true, "autoFix": true },
      "typeCheck": { "enabled": true },
      "secretScanning": { "enabled": true }
    },
    "allowBypass": true
  },
  "prePush": {
    "enabled": true,
    "checks": {
      "changeAnalysis": { "enabled": true },
      "criticalTests": { "enabled": true }
    }
  }
}
```

### Change Detection Rules

Edit `.githooks/config/change-rules.yml`:

```yaml
# Add custom patterns
patterns:
  custom_category:
    - 'custom/**/*.ts'
    description: 'Custom files'

# Adjust skip rules
skipRules:
  custom_tests:
    skipWhen:
      - pattern: 'documentation'
        only: true
    runWhen:
      - pattern: 'custom_category'
```

## 📈 Performance Metrics

### Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Pre-commit time** | 15-30s | 3-5s | 66-83% faster |
| **CI pipeline (docs)** | 5 min | 30s | 90% faster |
| **CI pipeline (code)** | 8 min | 4-5 min | 37-50% faster |
| **CI cost** | $100/mo | $60-70/mo | 30-40% savings |

### Real-time Metrics

Each pre-push displays:
- ⏱️ Estimated time saved in CI
- 💰 Estimated cost saved
- 📊 Which tests will be skipped
- 🎯 Build scope determination

Example output:

```
📊 Change Analysis:
──────────────────────────────────────────────────
  Build Scope:     ⚡ minimal
  Files Changed:   3
  Branch:          feature/update-docs
  Base Branch:     main

  Reasoning:
    • Changed: documentation (3 files)

──────────────────────────────────────────────────

💰 CI/CD Optimizations:
──────────────────────────────────────────────────
  ⏱️  Estimated Time Saved:  ~300s
  💵 Estimated Cost Saved:  ~90%

  Skipped in CI:
    • Database tests
    • Redis/cache tests
    • Integration tests
    • E2E tests
──────────────────────────────────────────────────

✅ All pre-push checks passed!
   Completed in 2.34s
   Safe to push! 🚀
```

## 🔒 Security Features

### Secret Scanning

Prevents committing:
- API keys
- Private keys
- Passwords
- Tokens
- AWS credentials

Patterns are configurable in `hook-config.json`.

### Dependency Auditing

CI runs `npm audit` and fails on:
- High severity vulnerabilities
- Critical severity vulnerabilities

Can be configured in workflow file.

## 🐛 Troubleshooting

### Hooks not running

```bash
# Reinstall hooks
npm run prepare

# Verify husky is installed
ls -la .husky/

# Check hook permissions
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### False positives in change detection

```bash
# Check what files changed
git diff --name-only main...HEAD

# Run analysis manually
npx tsx .githooks/scripts/analyze-changes.ts

# Review change-rules.yml patterns
```

### Slow pre-commit checks

```bash
# Enable caching in hook-config.json
{
  "performance": {
    "enableCaching": true,
    "cacheDir": ".githooks/.cache"
  }
}

# Clear cache if stale
rm -rf .githooks/.cache/
```

### CI jobs not skipping

1. Check that `analyze-changes` job ran successfully
2. Verify outputs are set correctly
3. Check `if` conditions in workflow jobs
4. Review change analysis output in CI logs

## 📚 Advanced Usage

### Custom Test Suites

Add custom test selection logic in `pre-push-check.ts`:

```typescript
if (analysis.categories.custom?.hasChanges) {
  console.log('Running custom tests...');
  execSync('npm run test:custom', { stdio: 'inherit' });
}
```

### Integration with AI Tools

Error reports are designed for AI consumption:

```typescript
// Read error report
const report = JSON.parse(
  fs.readFileSync('.githooks/reports/ERR-*.json', 'utf-8')
);

// Send to AI for automated fixing
await aiAgent.fixErrors(report);
```

### Custom Change Analysis

Add new categories in `change-rules.yml`:

```yaml
patterns:
  graphql:
    - '**/*.graphql'
    - '**/*.gql'
    description: 'GraphQL schemas and queries'

contentKeywords:
  graphql:
    imports:
      - 'graphql'
      - '@apollo/client'
    keywords:
      - 'gql`'
      - 'useQuery'
      - 'useMutation'
```

## 🤝 Contributing

### Adding New Checks

1. Create check function in `pre-commit-check.ts`
2. Add to `checks` array
3. Update `hook-config.json` with new option
4. Update documentation

### Improving Change Detection

1. Add patterns to `change-rules.yml`
2. Test with: `npx tsx .githooks/scripts/analyze-changes.ts`
3. Verify skip rules work correctly
4. Update CI workflow conditions

## 📞 Support

- **Issues**: Found a bug? Create an issue on GitHub
- **Questions**: Ask in team chat or create a discussion
- **Improvements**: Submit a PR with enhancements

## 📝 License

MIT License - see LICENSE file

---

**Made with ❤️ for the Pythoughts team**
