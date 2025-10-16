# Testing Execution Guide

**Date**: 2025-10-16
**Phase**: Phase 4 - Comprehensive QA Testing
**Status**: Ready for Execution

---

## Overview

This guide provides step-by-step instructions for executing all Phase 4 tests. Tests are organized by type: automated (can run immediately) and manual (requires human interaction).

---

## Prerequisites

### Required Tools

**Node.js Tools** (install globally):
```bash
# Lighthouse CI
npm install -g @lhci/cli@0.14.x

# Pa11y accessibility testing
npm install -g pa11y-ci

# Optional: wait-on (for server readiness checks)
npm install -g wait-on
```

**Verification**:
```bash
lhci --version  # Should show 0.14.x
pa11y-ci --version  # Should show version number
```

### Application Setup

1. **Ensure build works**:
   ```bash
   npm run build
   ```

2. **Verify preview server starts**:
   ```bash
   npm run preview
   # Should start on http://localhost:4173
   # Press Ctrl+C to stop
   ```

---

## Part 1: Automated Testing

### Test 1: Performance Audits (Lighthouse)

**Duration**: 10-15 minutes
**Tool**: Lighthouse CI

#### Option A: Using Automated Script

**Linux/Mac**:
```bash
chmod +x scripts/run-performance-tests.sh
./scripts/run-performance-tests.sh
```

**Windows**:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-performance-tests.ps1
```

#### Option B: Manual Execution

**Step 1: Build application**
```bash
npm run build
```

**Step 2: Start preview server**
```bash
npm run preview
# Keep this terminal running
```

**Step 3: Run Lighthouse** (in new terminal)
```bash
# Run full audit suite
lhci autorun --config=lighthouserc.json

# Or test single URL
lighthouse http://localhost:4173 --view --output html --output-path ./lighthouse-home.html
```

**Step 4: Review results**
- Results saved to `./lighthouse-results/`
- Open HTML reports in browser
- Review scores for Performance, Accessibility, Best Practices, SEO

**Step 5: Stop preview server**
```bash
# In preview server terminal: Ctrl+C
```

#### Expected Results

**Target Scores** (all should be 90+):
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

**Core Web Vitals**:
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
- TBT (Total Blocking Time): < 300ms

**URLs Tested**:
1. `/` - Homepage (posts feed)
2. `/blogs` - Blog listing
3. `/tasks` - Task board
4. `/profile` - User profile

---

### Test 2: Accessibility Scans (Pa11y)

**Duration**: 5-10 minutes
**Tool**: Pa11y CI

#### Execution Steps

**Step 1: Ensure preview server running**
```bash
npm run preview
# Should be running from previous test, or start again
```

**Step 2: Run Pa11y scans** (in new terminal)
```bash
pa11y-ci --config .pa11yci.json
```

**Step 3: Review results**
- Terminal output shows violations
- Screenshots saved to `./pa11y-screenshots/`
- Review any WCAG 2.1 AA violations

**Step 4: Stop preview server**
```bash
Ctrl+C
```

#### Expected Results

**Target**: Zero critical accessibility violations

**Common Issues to Check**:
- Color contrast ratios (4.5:1 minimum)
- Missing alt text on images
- Missing form labels
- Missing ARIA attributes
- Heading hierarchy issues

**WCAG 2.1 AA Compliance**:
- Level A: Must pass all (critical)
- Level AA: Must pass all (target)
- Level AAA: Nice to have (not required)

---

### Test 3: Security Audit

**Duration**: 2-3 minutes
**Tool**: npm audit

#### Execution Steps

```bash
# Run security audit
npm audit --audit-level=moderate

# Generate JSON report
npm audit --audit-level=moderate --json > docs/security-audit-latest.json

# Check for specific high/critical vulnerabilities
npm audit --audit-level=high
```

#### Expected Results

**Target**: Zero high or critical vulnerabilities in production dependencies

**Current Known Issues**:
- 2 moderate dev-only vulnerabilities (esbuild CORS bypass)
- Production impact: None
- Action: Document as known issue, defer fix

---

### Test 4: Bundle Size Analysis

**Duration**: 2-3 minutes
**Tool**: Vite build analysis

#### Execution Steps

```bash
# Build with analysis
npm run build

# Review output for chunk sizes
# All chunks should be under limits
```

#### Expected Results

**Target Bundle Sizes**:
- Main bundle: < 200 KB gzipped
- Total bundle: < 700 KB
- Largest chunk: < 350 KB

**Current Sizes** (from Phase 3):
- Total: 699 KB (218 KB gzipped) ✅
- Largest chunk (markdown): 341 KB ✅
- All targets met ✅

---

## Part 2: Manual Functional Testing

### Test 5: Functional Test Matrix

**Duration**: 3-4 hours
**Reference**: `docs/PHASE4_FUNCTIONAL_TEST_MATRIX.md`

#### Execution Steps

1. **Start development server**:
   ```bash
   npm run dev
   # Run on http://localhost:5173 for testing
   ```

2. **Open test matrix**: `docs/PHASE4_FUNCTIONAL_TEST_MATRIX.md`

3. **Execute tests in priority order**:
   - **P0 (Critical) first** - 18 tests
   - **P1 (High) second** - 12 tests
   - **P2 (Medium) last** - 4 tests

4. **For each test**:
   - Follow test steps exactly
   - Compare actual vs expected results
   - Mark status: Pass / Fail / Blocked
   - Document any bugs found
   - Take screenshots for failures

5. **Bug reporting**:
   - Use template: `docs/bug-template.md` (create if needed)
   - Priority: P0 / P1 / P2 / P3
   - Include: Steps to reproduce, expected, actual, screenshots

#### Test Categories

**Authentication (6 tests)** - 45 minutes:
- AUTH-001: Sign up with email/password
- AUTH-002: Sign in with email/password
- AUTH-003: Sign in with wrong password
- AUTH-004: Sign in with Google OAuth
- AUTH-005: Password reset flow
- AUTH-006: Sign out

**Post Management (7 tests)** - 60 minutes:
- POST-001 to POST-007
- Focus: Create, edit, delete, vote, markdown

**Comments (3 tests)** - 30 minutes:
- COMMENT-001 to COMMENT-003
- Focus: Add, reply, vote

**Blog Management (3 tests)** - 45 minutes:
- BLOG-001 to BLOG-003
- Focus: Create, draft, filter

**Task Management (4 tests)** - 45 minutes:
- TASK-001 to TASK-004
- Focus: Create, drag-drop, edit, delete

**User Profile (3 tests)** - 30 minutes:
- PROFILE-001 to PROFILE-003
- Focus: View, edit, avatar

**Social Features (4 tests)** - 45 minutes:
- SOCIAL-001 to SOCIAL-004
- Focus: Follow, unfollow, block, notifications

**Other (4 tests)** - 30 minutes:
- Trending, pagination, responsive design

---

### Test 6: Cross-Browser Testing

**Duration**: 2-3 hours
**Browsers**: Chrome, Firefox, Safari, Edge

#### Execution Steps

1. **For each browser**:
   - Open application: http://localhost:5173
   - Execute critical user journeys (15 min per browser):
     - Sign up / Sign in
     - Create post
     - Vote and comment
     - Create task
     - View profile

2. **Test focus areas**:
   - Layout consistency
   - JavaScript functionality
   - Form validation
   - File uploads (if implemented)
   - Real-time features

3. **Document issues**:
   - Browser-specific bugs
   - Layout inconsistencies
   - Functionality not working
   - Performance differences

#### Expected Results

**Target**: Application works consistently across all browsers

**Common Issues**:
- CSS rendering differences
- Flexbox/Grid variations
- JavaScript API differences
- Date/time formatting

---

### Test 7: Mobile Responsiveness

**Duration**: 1-2 hours
**Devices**: Chrome DevTools + Real devices

#### Execution Steps

**Chrome DevTools Testing**:
```
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test each device:
   - iPhone SE (375px)
   - iPhone 14 (390px)
   - iPad (768px)
   - iPad Pro (1024px)
4. Test in portrait and landscape
```

**Real Device Testing** (if available):
```
1. Find local IP: ipconfig (Windows) or ifconfig (Mac/Linux)
2. Start dev server: npm run dev -- --host
3. Access from mobile: http://[YOUR-IP]:5173
4. Test critical journeys
```

#### Test Checklist

- [ ] Navigation menu (hamburger on mobile)
- [ ] Forms (keyboard behavior)
- [ ] Buttons (touch target size 44×44px minimum)
- [ ] Images (responsive sizing)
- [ ] Modals (full-screen on mobile)
- [ ] Tables (horizontal scroll if needed)
- [ ] Touch gestures (swipe, pinch if implemented)

---

### Test 8: Manual Accessibility Testing

**Duration**: 2-3 hours
**Tools**: Keyboard, Screen reader

#### Keyboard Navigation Testing

**Steps**:
1. Close mouse (don't use it)
2. Use only keyboard:
   - Tab: Next element
   - Shift+Tab: Previous element
   - Enter/Space: Activate button
   - Escape: Close modal
   - Arrow keys: Navigate lists

**Checklist**:
- [ ] Tab order is logical (top to bottom, left to right)
- [ ] All interactive elements focusable
- [ ] Focus indicators visible (outline/ring)
- [ ] Skip to main content link
- [ ] Modals trap focus
- [ ] Escape closes modals
- [ ] No keyboard traps

#### Screen Reader Testing

**Tools**:
- Windows: NVDA (free) or JAWS
- Mac: VoiceOver (built-in)
- Linux: Orca

**Steps**:
1. Start screen reader
2. Navigate application with keyboard only
3. Listen to announcements

**Checklist**:
- [ ] Page title announced
- [ ] Headings announced with level
- [ ] Links announced with text
- [ ] Buttons announced with role
- [ ] Form labels announced
- [ ] Error messages announced
- [ ] Live regions announce updates (notifications)
- [ ] Images have alt text

---

### Test 9: Manual Security Testing

**Duration**: 2-3 hours
**Tools**: Browser DevTools, Burp Suite (optional)

#### XSS Testing

**Test inputs** (try in all text fields):
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
javascript:alert('XSS')
<iframe src="javascript:alert('XSS')">
```

**Fields to test**:
- Post title and content
- Comment text
- User bio
- Task descriptions
- Blog content
- Search queries

**Expected**: All inputs sanitized, no alert popups

#### CSRF Testing

**Steps**:
1. Open DevTools → Network tab
2. Perform state-changing action (create post, vote, etc.)
3. Check request headers for CSRF token
4. Try replaying request from different origin

**Expected**: CSRF protection in place (SameSite cookies)

#### Authorization Testing

**Steps**:
1. Create post as User A
2. Get post ID from URL
3. Sign out, sign in as User B
4. Try to edit/delete User A's post (direct URL manipulation)

**Expected**: Permission denied, cannot edit other user's content

---

## Part 3: User Acceptance Testing (UAT)

### Test 10: UAT Execution

**Duration**: 1 week
**Participants**: 10-15 beta testers
**Reference**: `docs/PHASE4_UAT_PLAN.md`

#### Execution Steps

**Week Before UAT**:
- [ ] Launch recruitment campaign (Reddit, Twitter, Discord)
- [ ] Monitor applications
- [ ] Select 10-15 testers
- [ ] Send onboarding emails

**Week 1 (UAT Week)**:
- [ ] Day 1: Testers sign up, complete Scenario 1
- [ ] Day 2: Testers complete Scenario 2
- [ ] Day 3: Testers complete Scenario 3
- [ ] Day 4: Testers complete Scenario 4
- [ ] Days 5-7: Free exploration, submit feedback survey

**Week After UAT**:
- [ ] Analyze survey results
- [ ] Calculate metrics (satisfaction, NPS)
- [ ] Create UAT report
- [ ] Prioritize bug fixes and feature requests

---

## Test Results Documentation

### Create Performance Report

**File**: `docs/PHASE4_PERFORMANCE_REPORT.md`

**Template**:
```markdown
# Phase 4 Performance Report

**Date**: [Date]
**Tester**: [Name]

## Lighthouse Results

### Homepage (/)
- Performance: [Score]/100
- Accessibility: [Score]/100
- Best Practices: [Score]/100
- SEO: [Score]/100

**Core Web Vitals**:
- LCP: [value]s
- FID: [value]ms
- CLS: [value]
- TBT: [value]ms

**Issues Found**:
1. [Issue description]
2. [Issue description]

### [Repeat for each URL]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

### Create Accessibility Report

**File**: `docs/PHASE4_ACCESSIBILITY_REPORT.md`

**Template**:
```markdown
# Phase 4 Accessibility Report

**Date**: [Date]
**Tester**: [Name]
**Standard**: WCAG 2.1 AA

## Automated Scan Results (Pa11y)

**Homepage (/)**:
- Critical violations: [count]
- Warnings: [count]

**Issues**:
1. [Issue] - [WCAG criterion]
2. [Issue] - [WCAG criterion]

### [Repeat for each URL]

## Manual Testing Results

**Keyboard Navigation**:
- Status: Pass/Fail
- Issues: [list]

**Screen Reader**:
- Status: Pass/Fail
- Issues: [list]

## Summary
- Total violations: [count]
- Must fix: [count P0]
- Should fix: [count P1]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

### Create Bug Tracker

**File**: `docs/PHASE4_BUG_TRACKER.md`

**Template**:
```markdown
# Phase 4 Bug Tracker

## P0 - Critical Bugs

| ID | Title | Description | Steps to Reproduce | Status |
|----|-------|-------------|-------------------|--------|
| BUG-001 | [Title] | [Desc] | [Steps] | Open/Fixed |

## P1 - High Priority Bugs

| ID | Title | Description | Steps to Reproduce | Status |
|----|-------|-------------|-------------------|--------|
| BUG-101 | [Title] | [Desc] | [Steps] | Open/Fixed |

## P2 - Medium Priority Bugs

[Same format]

## P3 - Low Priority Bugs

[Same format]

## Summary
- Total bugs: [count]
- P0: [count] (all must be fixed)
- P1: [count] (aim for 90% fixed)
- P2: [count] (fix time permitting)
- P3: [count] (backlog)
```

---

## Testing Schedule

### Week 1: Automated + High Priority Manual

**Monday** (4 hours):
- [x] Run Lighthouse audits (1 hour)
- [x] Run Pa11y scans (1 hour)
- [ ] Review automated results (1 hour)
- [ ] Begin P0 functional tests (1 hour)

**Tuesday** (6 hours):
- [ ] Complete P0 functional tests (3 hours)
- [ ] Begin P1 functional tests (3 hours)

**Wednesday** (6 hours):
- [ ] Complete P1 functional tests (3 hours)
- [ ] Cross-browser testing (3 hours)

**Thursday** (6 hours):
- [ ] Mobile responsiveness testing (3 hours)
- [ ] Manual accessibility testing (3 hours)

**Friday** (6 hours):
- [ ] Manual security testing (3 hours)
- [ ] Fix P0 bugs (3 hours)
- [ ] Document all findings

### Week 2: Bug Fixes + UAT Prep

**Monday-Wednesday**:
- [ ] Fix all P0 bugs
- [ ] Fix 90% of P1 bugs
- [ ] Re-test fixed bugs

**Thursday-Friday**:
- [ ] Launch UAT recruitment
- [ ] Select beta testers
- [ ] Send onboarding materials

### Week 3: UAT Execution

[See UAT Plan]

### Week 4: UAT Analysis + Final Fixes

[See UAT Plan]

---

## Success Criteria

**Automated Tests**:
- [ ] Lighthouse scores 90+ on all URLs
- [ ] Zero critical accessibility violations (Pa11y)
- [ ] Zero high/critical security vulnerabilities

**Manual Tests**:
- [ ] All 34 functional tests executed
- [ ] All P0 bugs fixed
- [ ] 90% of P1 bugs fixed
- [ ] Cross-browser: Works in Chrome, Firefox, Safari, Edge
- [ ] Mobile: Works on iOS and Android
- [ ] Accessibility: Keyboard navigation and screen reader compatible

**UAT**:
- [ ] 10-15 testers recruited and completed testing
- [ ] Overall satisfaction: 4.0+/5.0
- [ ] Net Promoter Score: 40+
- [ ] 80%+ would recommend

---

## Troubleshooting

### Lighthouse Issues

**Issue**: "Unable to reach localhost:4173"
**Solution**: Ensure preview server is running, wait 10 seconds after starting

**Issue**: "Scores below 90"
**Solution**: Review recommendations in report, implement fixes, re-test

### Pa11y Issues

**Issue**: "ECONNREFUSED"
**Solution**: Start preview server first, then run Pa11y

**Issue**: "Too many violations"
**Solution**: Review violations by severity, fix critical first, re-scan

### Build Issues

**Issue**: "Out of memory"
**Solution**: Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-16
**Status**: Ready for Use
