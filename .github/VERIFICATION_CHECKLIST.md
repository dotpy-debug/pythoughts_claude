# Codecov Integration Verification Checklist

Use this checklist to verify that the Codecov integration is working correctly.

## Pre-Verification: Required Setup

- [ ] Codecov account created and signed in
- [ ] Repository added to Codecov dashboard
- [ ] `CODECOV_TOKEN` added to GitHub Secrets
- [ ] Badge URLs in README.md updated with your GitHub username

**If any of these are not done**, see [CODECOV_SETUP.md](./CODECOV_SETUP.md) first.

## Local Verification

### 1. Test Coverage Generation

```bash
# Generate coverage
npm run test:coverage
```

**Expected Result**:
- Tests run successfully
- Coverage report displayed in terminal
- `coverage/` directory created with:
  - `index.html` - HTML report
  - `lcov.info` - LCOV format for upload
  - `coverage-final.json` - JSON report

**Check**:
- [ ] Coverage percentage shown in terminal
- [ ] Coverage meets 70% threshold
- [ ] No errors during test execution

### 2. View Coverage HTML Report

```bash
npm run coverage:view
```

**Expected Result**:
- Opens `coverage/index.html` in your default browser
- Shows coverage dashboard with file tree
- Can click through files to see line-by-line coverage

**Check**:
- [ ] HTML report opens successfully
- [ ] Can navigate file tree
- [ ] Green/red highlights show covered/uncovered lines

### 3. Test Codecov Vite Plugin (Optional)

If you have `CODECOV_TOKEN` set locally:

```bash
# Windows PowerShell
$env:CODECOV_TOKEN="your-token-here"

# Run tests
npm run test:coverage
```

**Expected Result**:
- Coverage runs normally
- Codecov plugin logs upload attempt (may fail without proper CI context)

**Check**:
- [ ] No errors from Codecov plugin
- [ ] Plugin logs visible in output

## CI/CD Verification

### 1. Push a Commit

```bash
git add .
git commit -m "test: verify codecov integration"
git push origin main
```

### 2. Check GitHub Actions

Go to: `https://github.com/YOUR_USERNAME/pythoughts_claude/actions`

**Expected Result**:
- "Code Quality Checks" workflow triggered
- "Unit Tests & Coverage" job runs
- All steps complete successfully

**Check**:
- [ ] Workflow starts automatically
- [ ] "Run tests with coverage" step succeeds
- [ ] "Upload coverage to Codecov" step succeeds
- [ ] No authentication errors
- [ ] Coverage artifact uploaded

**If Upload Fails**:
1. Check step logs for specific error
2. Verify `CODECOV_TOKEN` is set in GitHub Secrets
3. Ensure token is correct (no extra spaces)
4. See [CODECOV_SETUP.md#troubleshooting](./CODECOV_SETUP.md#troubleshooting)

### 3. Check Codecov Dashboard

Go to: `https://codecov.io/gh/YOUR_USERNAME/pythoughts_claude`

**Expected Result**:
- Coverage percentage displayed
- Commit appears in commit list
- Coverage graph starts building
- File tree shows coverage by file

**Check**:
- [ ] Dashboard shows coverage data
- [ ] Latest commit visible
- [ ] Coverage percentage matches local run
- [ ] File-level breakdown available

**If No Data Appears**:
1. Wait 2-3 minutes for processing
2. Check GitHub Actions logs for upload errors
3. Verify repository is correctly linked in Codecov
4. Check that upload used correct token

## Pull Request Verification

### 1. Create a Test Branch

```bash
git checkout -b test/codecov-integration
```

### 2. Make a Change with Tests

Add a simple utility function and test:

```typescript
// src/utils/testHelper.ts
export function add(a: number, b: number): number {
  return a + b;
}

// src/utils/testHelper.test.ts
import { describe, it, expect } from 'vitest';
import { add } from './testHelper';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

### 3. Push and Create PR

```bash
git add .
git commit -m "test: add sample test for codecov verification"
git push origin test/codecov-integration
```

Create PR on GitHub: main ← test/codecov-integration

### 4. Check PR Comments

**Expected Result**:
- Codecov bot posts a comment within 2-5 minutes
- Comment shows coverage comparison
- Lists files with coverage changes
- Shows overall coverage delta

**Check**:
- [ ] Codecov comment appears
- [ ] Shows coverage percentage
- [ ] Shows coverage diff (+/- percentage)
- [ ] Lists changed files with coverage

**Example Comment**:
```markdown
## Codecov Report
Coverage: 72.45% (+0.15%) compared to base
Files with Coverage Changes:
- src/utils/testHelper.ts: 100% (new file)
```

### 5. Check GitHub Status Checks

**Expected Result**:
- "codecov/project" status appears
- "codecov/patch" status appears
- Both show ✅ green checkmarks (if thresholds met)

**Check**:
- [ ] Status checks appear
- [ ] Checks pass (green)
- [ ] Click "Details" shows Codecov report

**If Checks Fail**:
- Red ❌ means coverage dropped below threshold
- Click "Details" to see which threshold failed
- Add more tests to increase coverage

### 6. Check Inline Annotations

Go to "Files changed" tab in PR

**Expected Result**:
- New lines have green/red coverage highlights
- Green: Line is covered by tests
- Red: Line is NOT covered by tests
- Hovering shows execution count

**Check**:
- [ ] Coverage highlights visible
- [ ] Green for tested code
- [ ] Red for untested code

## Badge Verification

### 1. Check README Badges

Go to: `https://github.com/YOUR_USERNAME/pythoughts_claude`

**Expected Result**:
- Codecov badge shows current coverage percentage
- Badge is clickable and links to Codecov dashboard
- Badge updates after each push

**Check**:
- [ ] Badge displays correctly
- [ ] Shows percentage (e.g., "72%")
- [ ] Click goes to Codecov dashboard
- [ ] Badge color reflects coverage (red <50%, yellow 50-70%, green >70%)

**If Badge Shows "unknown"**:
1. Verify badge URL is correct
2. Wait for first successful upload
3. Check that branch name is correct (default: main)

## Advanced Verification

### 1. Test Coverage Thresholds

Temporarily lower coverage:

```bash
# Comment out some tests
npm run test:coverage
```

**Expected Result**:
- Vitest fails with threshold error
- Shows which metric fell below 70%

**Check**:
- [ ] Build fails when coverage < 70%
- [ ] Clear error message shown

### 2. Test Component Coverage (Optional)

If you enabled component management in `codecov.yml`:

**Expected Result**:
- Codecov dashboard shows coverage by component
- Can filter by component (Auth, Blog, Services, etc.)

**Check**:
- [ ] Components visible in dashboard
- [ ] Per-component coverage tracked

### 3. Test Coverage Trends

After multiple commits:

**Expected Result**:
- Coverage graph shows trend over time
- Can see coverage changes per commit
- Graph is interactive (hover for details)

**Check**:
- [ ] Graph displays in dashboard
- [ ] Shows historical data
- [ ] Interactive tooltips work

## Troubleshooting Failed Checks

### Upload Fails in CI

**Symptoms**: "Upload coverage to Codecov" step fails

**Check**:
1. GitHub Actions logs
2. Error message from Codecov action
3. `CODECOV_TOKEN` secret exists and is correct

**Common Issues**:
- Token not set: Add to GitHub Secrets
- Invalid token: Regenerate in Codecov and update
- Network error: Retry workflow

### Coverage Report Empty

**Symptoms**: Codecov shows 0% coverage

**Check**:
1. `coverage/lcov.info` exists after test run
2. File is not empty (`cat coverage/lcov.info`)
3. Coverage exclusions in `codecov.yml` not too broad

**Common Issues**:
- Tests didn't run: Check test execution logs
- LCOV not generated: Verify Vitest config
- All files excluded: Review exclusion patterns

### PR Comments Not Appearing

**Symptoms**: No Codecov comment on PRs

**Check**:
1. Base branch (main) has coverage data
2. PR comments enabled in Codecov settings
3. Codecov GitHub App has repo permissions

**Common Issues**:
- First PR: Base branch needs coverage first
- Settings disabled: Enable in Codecov dashboard
- Permissions: Reinstall Codecov GitHub App

### Status Checks Missing

**Symptoms**: No codecov/project or codecov/patch checks

**Check**:
1. Status checks enabled in Codecov settings
2. Codecov GitHub App installed
3. Repository connected correctly

**Common Issues**:
- App not installed: Install from Codecov dashboard
- Checks disabled: Enable in Settings > General
- Repository not synced: Re-sync in Codecov

## Success Criteria

All checks should pass:

**Local**:
- ✅ Coverage runs locally
- ✅ HTML report viewable
- ✅ 70% threshold met

**CI/CD**:
- ✅ Workflow runs successfully
- ✅ Coverage uploaded to Codecov
- ✅ Artifacts saved

**Codecov Dashboard**:
- ✅ Coverage data visible
- ✅ File tree shows breakdown
- ✅ Graph building

**Pull Requests**:
- ✅ Codecov comment appears
- ✅ Status checks present
- ✅ Inline annotations visible

**README**:
- ✅ Badge displays correctly
- ✅ Badge links to dashboard

## Next Steps After Verification

Once everything is working:

1. **Remove Test Branch**: Delete the verification branch
2. **Update Documentation**: Update badge URLs if needed
3. **Set Team Expectations**: Share coverage guidelines
4. **Monitor Coverage**: Check dashboard weekly
5. **Enforce Thresholds**: Consider making checks required

## Resources

- [Codecov Setup Guide](./CODECOV_SETUP.md)
- [Coverage Guide](../COVERAGE_GUIDE.md)
- [Integration Summary](../CODECOV_INTEGRATION_SUMMARY.md)
- [Codecov Documentation](https://docs.codecov.com)

## Need Help?

If verification fails:
1. Review this checklist carefully
2. Check [CODECOV_SETUP.md#troubleshooting](./CODECOV_SETUP.md#troubleshooting)
3. Review GitHub Actions logs
4. Check Codecov dashboard for errors
5. Open an issue in the repository
