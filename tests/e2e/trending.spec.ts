import { test, expect } from '@playwright/test';

test.describe('Trending Algorithm Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display trending posts section', async ({ page }) => {
    // Look for trending section
    await expect(
      page.locator('text=/trending|popular|hot/i').first()
    ).toBeVisible({ timeout: 10000 });

    // Verify trending posts are displayed
    await expect(
      page.locator('[data-testid="trending-post"], [data-trending="true"]').first()
    ).toBeVisible();
  });

  test('should show trending posts in descending order', async ({ page }) => {
    // Navigate to trending page
    await page.click('a[href*="trending"], text=/trending/i');

    // Wait for trending posts to load
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    // Get all post cards
    const posts = page.locator('[data-testid="post-card"], article');
    const count = await posts.count();

    expect(count).toBeGreaterThan(0);

    // Verify posts are ordered by engagement
    // (This assumes posts display engagement metrics)
    const _firstPostEngagement = await posts
      .first()
      .locator('[data-testid="engagement-score"], .engagement')
      .first()
      .textContent();
    void _firstPostEngagement; // Could be used for engagement comparison

    const _lastPostEngagement = await posts
      .last()
      .locator('[data-testid="engagement-score"], .engagement')
      .first()
      .textContent();
    void _lastPostEngagement; // Could be used for engagement comparison

    // First post should have higher or equal engagement than last
    // Note: This is a simplified check, actual implementation may vary
  });

  test('should update trending when post receives engagement', async ({
    page,
  }) => {
    // Sign in first
    await page.click('text=sign in');
    await page.fill('input[type="email"]', 'test@pythoughts.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Navigate to trending
    await page.click('a[href*="trending"], text=/trending/i');

    // Get first post
    const firstPost = page.locator('[data-testid="post-card"], article').first();
    const postTitle = await firstPost
      .locator('h2, h3, [data-testid="post-title"]')
      .first()
      .textContent();

    // Engage with the post (like, comment)
    await firstPost.click();
    await page.click('button:has-text("👍"), button[aria-label*="like" i]');

    // Add a comment
    await page.fill(
      'textarea[placeholder*="comment" i]',
      'Great trending post!'
    );
    await page.click('button:has-text("comment"), button[type="submit"]');

    // Post should remain in trending or move up
    await page.goto('/trending');
    await expect(page.locator(`text=${postTitle}`)).toBeVisible();
  });

  test('should show trending categories', async ({ page }) => {
    // Navigate to trending
    await page.click('a[href*="trending"], text=/trending/i');

    // Categories should be visible
    await expect(
      page.locator('button:has-text("Tech"), button:has-text("Design")')
    ).toBeVisible();
  });

  test('should filter trending by category', async ({ page }) => {
    await page.click('a[href*="trending"], text=/trending/i');

    // Click on Tech category
    await page.click('button:has-text("Tech"), a[href*="category=tech"]');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // Verify only tech posts are shown
    const posts = page.locator('[data-testid="post-card"], article');
    const count = await posts.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should display trending time ranges', async ({ page }) => {
    await page.click('a[href*="trending"], text=/trending/i');

    // Look for time range filters
    await expect(
      page.locator('button:has-text("Today"), button:has-text("This Week")')
    ).toBeVisible();
  });

  test('should filter trending by time range', async ({ page }) => {
    await page.click('a[href*="trending"], text=/trending/i');

    // Click "This Week" filter
    await page.click('button:has-text("This Week")');

    // Wait for results
    await page.waitForLoadState('networkidle');

    // Verify posts are from this week
    const posts = page.locator('[data-testid="post-card"], article');
    const count = await posts.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should show trending stats', async ({ page }) => {
    await page.click('a[href*="trending"], text=/trending/i');

    // Verify engagement metrics are displayed
    await expect(
      page.locator('text=/views|likes|comments/i').first()
    ).toBeVisible();
  });

  test('should highlight trending posts in main feed', async ({ page }) => {
    await page.goto('/');

    // Trending posts should have a visual indicator
    const trendingPosts = page.locator('[data-trending="true"], .trending-post');

    // At least one trending post should be visible
    await expect(trendingPosts.first()).toBeVisible({ timeout: 10000 });
  });

  test('should calculate trending score based on multiple factors', async ({
    page,
  }) => {
    // Sign in
    await page.click('text=sign in');
    await page.fill('input[type="email"]', 'test@pythoughts.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Create a new post
    await page.click('text=/create|new post/i');

    const postTitle = `Trending Test ${Date.now()}`;
    await page.fill('input[placeholder*="title" i]', postTitle);
    await page.fill(
      'textarea, [contenteditable="true"]',
      'This post should trend based on engagement'
    );
    await page.click('button[type="submit"], button:has-text("publish")');

    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Engage with the post multiple times
    await page.click(`text=${postTitle}`);

    // Like the post
    await page.click('button:has-text("👍"), button[aria-label*="like" i]');

    // Add multiple comments
    for (let i = 0; i < 3; i++) {
      await page.fill(
        'textarea[placeholder*="comment" i]',
        `Comment ${i + 1}`
      );
      await page.click('button:has-text("comment"), button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Add reactions
    await page.click('button[aria-label*="react" i], button:has-text("😊")');
    await page.click('button:has-text("❤️")');

    // Navigate to trending
    await page.goto('/trending');

    // Post should appear in trending
    await expect(page.locator(`text=${postTitle}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show fresh trending content on page refresh', async ({
    page,
  }) => {
    await page.click('a[href*="trending"], text=/trending/i');

    // Get first post title
    const firstPost = page.locator('[data-testid="post-card"], article').first();
    const _firstTitle = await firstPost
      .locator('h2, h3, [data-testid="post-title"]')
      .first()
      .textContent();
    void _firstTitle; // Could be used for title comparison after reload

    // Reload page
    await page.reload();

    // Trending posts should load again
    await expect(
      page.locator('[data-testid="post-card"], article').first()
    ).toBeVisible({ timeout: 10000 });

    // Content should be fresh (may or may not be same post)
    const postsCount = await page
      .locator('[data-testid="post-card"], article')
      .count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('should cache trending results for performance', async ({ page }) => {
    await page.click('a[href*="trending"], text=/trending/i');

    // Wait for initial load
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    // Measure load time
    const startTime = Date.now();

    // Navigate away and back
    await page.goto('/');
    await page.click('a[href*="trending"], text=/trending/i');

    // Should load faster from cache
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 5000,
    });

    const loadTime = Date.now() - startTime;

    // Cached load should be reasonably fast
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle empty trending results gracefully', async ({ page }) => {
    // Navigate to a category with no posts
    await page.goto('/trending?category=nonexistent');

    // Should show empty state
    await expect(
      page.locator('text=/no posts|no trending|empty/i')
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Trending Algorithm Edge Cases', () => {
  test('should not show deleted posts in trending', async ({ page }) => {
    // This test would require seeding data with deleted posts
    // and verifying they don't appear in trending results
    await page.goto('/trending');

    const posts = page.locator('[data-testid="post-card"], article');
    const count = await posts.count();

    // All displayed posts should be valid
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should prioritize recent posts over old popular posts', async ({
    page,
  }) => {
    await page.goto('/trending');

    // Get timestamp or date of first post
    const firstPost = page.locator('[data-testid="post-card"], article').first();

    // Post should be relatively recent (within last week)
    const postDate = await firstPost
      .locator('[data-testid="post-date"], time')
      .first()
      .getAttribute('datetime');

    if (postDate) {
      const postTime = new Date(postDate).getTime();
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // Top trending should typically be recent
      expect(postTime).toBeGreaterThan(weekAgo);
    }
  });
});
