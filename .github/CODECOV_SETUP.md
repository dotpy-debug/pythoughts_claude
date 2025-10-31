# Codecov Setup Instructions

This guide will help you set up Codecov for the Pythoughts project to track test coverage over time.

## Why Codecov?

Codecov provides:
- Automated coverage reporting on every PR
- Visual coverage trends over time
- Inline coverage annotations in GitHub
- Coverage badges for the README
- Coverage comparisons between branches
- Detailed coverage reports by file and function

## Step 1: Sign Up for Codecov

1. Go to [https://codecov.io](https://codecov.io)
2. Click "Sign Up" in the top right
3. Choose "Sign up with GitHub"
4. Authorize Codecov to access your GitHub account

## Step 2: Add the Pythoughts Repository

1. After signing in, you'll see your dashboard
2. Click on "Add Repository" or "Not yet set up"
3. Find `pythoughts_claude` in the repository list
4. Click "Set up repo" next to it

If you don't see the repository:
- Make sure you've authorized Codecov for the GitHub organization
- Try clicking "Sync Repos" to refresh the list
- Ensure you have admin access to the repository

## Step 3: Get Your Upload Token

Once the repository is added:

1. Navigate to the repository in Codecov dashboard
2. Click on "Settings" in the left sidebar
3. Click on "General" tab
4. You'll see a section called "Repository Upload Token"
5. Click "Copy" to copy the token to your clipboard

The token will look something like:
```
12345678-90ab-cdef-1234-567890abcdef
```

## Step 4: Add Token to GitHub Secrets

Now add the token as a GitHub secret so the CI/CD pipeline can upload coverage:

1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/pythoughts_claude
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables" > "Actions"
4. Click "New repository secret" (green button)
5. Fill in the details:
   - **Name**: `CODECOV_TOKEN`
   - **Value**: Paste the token you copied from Codecov
6. Click "Add secret"

## Step 5: Verify Setup

Now verify everything is working:

### Test Locally (Optional)

1. Set the token locally (temporary):
   ```bash
   # Windows (PowerShell)
   $env:CODECOV_TOKEN="your-token-here"

   # Windows (CMD)
   set CODECOV_TOKEN=your-token-here

   # macOS/Linux
   export CODECOV_TOKEN=your-token-here
   ```

2. Run tests with coverage:
   ```bash
   npm run test:coverage
   ```

3. You should see output from the Codecov Vite plugin indicating successful upload

### Test with GitHub Actions

1. Push a commit to your repository:
   ```bash
   git add .
   git commit -m "test: verify codecov integration"
   git push
   ```

2. Go to the "Actions" tab in GitHub
3. Watch the "Code Quality Checks" workflow run
4. The "Unit Tests & Coverage" job should complete successfully
5. You should see "Upload coverage to Codecov" step succeed

### Check Codecov Dashboard

1. Go back to Codecov dashboard
2. Navigate to your repository
3. You should now see:
   - Coverage percentage
   - Coverage graph showing trends
   - List of commits with coverage data
   - File-level coverage breakdown

## Step 6: Enable PR Comments (Recommended)

To get automatic PR comments with coverage changes:

1. In Codecov dashboard, go to Settings > General
2. Scroll to "Pull Request Comments"
3. Ensure "Comment on pull requests" is enabled
4. Customize the comment layout if desired (default is good)

## Step 7: Add Codecov Badge to README

The badge is already configured in the README.md, but you need to update the URL:

1. In Codecov dashboard, click on "Settings" > "Badge"
2. Copy the Markdown badge code
3. Replace the placeholder in README.md:
   ```markdown
   [![codecov](https://codecov.io/gh/YOUR_USERNAME/pythoughts_claude/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/pythoughts_claude)
   ```

## Troubleshooting

### Token Not Working

If you get authentication errors:

1. Verify the token is exactly as copied (no extra spaces)
2. Make sure the secret name is exactly `CODECOV_TOKEN`
3. Try regenerating the token in Codecov settings
4. Check that the repository is properly connected in Codecov

### No Coverage Uploaded

If the workflow runs but no coverage appears:

1. Check the GitHub Actions logs for the "Upload coverage to Codecov" step
2. Look for error messages or failed uploads
3. Verify `coverage/lcov.info` file is being generated:
   ```bash
   npm run test:coverage
   ls -la coverage/
   ```
4. Ensure you're on the main branch or a tracked branch

### Coverage Incomplete or Inaccurate

If coverage seems wrong:

1. Check `codecov.yml` ignore patterns - make sure you're not excluding too much
2. Review `vitest.config.ts` coverage exclude patterns
3. Look at the Codecov dashboard's "Files" tab to see what's included
4. Check if source files are being counted as test files

### PR Comments Not Appearing

If PRs don't get coverage comments:

1. Verify PR comments are enabled in Codecov settings
2. Check that the Codecov GitHub App has the right permissions
3. Ensure the base branch has coverage data to compare against
4. Wait a few minutes - sometimes comments are delayed

### Windows Path Issues

If you see path-related errors on Windows:

The `codecov.yml` includes path normalization for Windows:
```yaml
fixes:
  - "D:/New_Projects/pythoughts_claude-main/::"
```

If you cloned the repo to a different path, update this line in `codecov.yml`.

## Advanced Configuration

### Adjust Coverage Thresholds

To change the minimum coverage percentage:

1. Edit `codecov.yml`:
   ```yaml
   coverage:
     status:
       project:
         default:
           target: 80%  # Change from 70% to 80%
   ```

2. Also update `vitest.config.ts` to match:
   ```typescript
   thresholds: {
     lines: 80,
     functions: 80,
     branches: 80,
     statements: 80,
   }
   ```

### Enable Component Coverage

To track coverage by feature area, uncomment the component section in `codecov.yml`:

```yaml
component_management:
  individual_components:
    - component_id: frontend_components
      name: Frontend Components
      paths:
        - src/components/**
```

### Add Coverage Notifications

To get Slack notifications:

1. In Codecov dashboard, go to Settings > Notifications
2. Click "Add Slack Integration"
3. Follow the instructions to connect your Slack workspace
4. Enable notifications for:
   - Coverage drops
   - Failed uploads
   - PR comments

## Useful Resources

- [Codecov Documentation](https://docs.codecov.com)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)
- [Codecov YAML Reference](https://docs.codecov.com/docs/codecov-yaml)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)

## Need Help?

If you encounter issues not covered here:

1. Check the [Codecov Status Page](https://status.codecov.io)
2. Review GitHub Actions logs for detailed error messages
3. Visit [Codecov Community Forum](https://community.codecov.com)
4. Check the project's [COVERAGE_GUIDE.md](../COVERAGE_GUIDE.md) for usage tips
