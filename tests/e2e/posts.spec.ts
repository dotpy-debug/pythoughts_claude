import { test, expect } from '@playwright/test';

test.describe('Post Creation and Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/');
    await page.click('text=sign in');
    await page.fill('input[type="email"]', 'test@pythoughts.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  });

  test('should open create post modal', async ({ page }) => {
    // Click create post button
    await page.click('text=/create|new post/i');

    // Modal should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(
      page.locator('text=/create|new post|write/i').first()
    ).toBeVisible();
  });

  test('should create a new text post', async ({ page }) => {
    // Open create post modal
    await page.click('text=/create|new post/i');

    // Fill in post details
    const postTitle = `Test Post ${Date.now()}`;
    const postContent = 'This is a test post content created by E2E test.';

    await page.fill('input[placeholder*="title" i]', postTitle);
    await page.fill('textarea, [contenteditable="true"]', postContent);

    // Submit post
    await page.click('button[type="submit"], button:has-text("publish")');

    // Wait for modal to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Verify post appears in feed
    await expect(page.locator(`text=${postTitle}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should like a post', async ({ page }) => {
    // Navigate to posts page or ensure posts are visible
    await page.goto('/');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    // Get initial like count
    const likeButton = page
      .locator('button:has-text("👍"), button[aria-label*="like" i]')
      .first();

    // Click like button
    await likeButton.click();

    // Verify like state changed (button should be highlighted or count increased)
    await expect(likeButton).toHaveAttribute('aria-pressed', 'true', {
      timeout: 5000,
    });
  });

  test('should unlike a liked post', async ({ page }) => {
    await page.goto('/');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    const likeButton = page
      .locator('button:has-text("👍"), button[aria-label*="like" i]')
      .first();

    // Like the post
    await likeButton.click();
    await expect(likeButton).toHaveAttribute('aria-pressed', 'true');

    // Unlike the post
    await likeButton.click();
    await expect(likeButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('should add a comment to a post', async ({ page }) => {
    await page.goto('/');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    // Click on first post to view details
    await page.click('[data-testid="post-card"], article');

    // Wait for comment section
    await page.waitForSelector('textarea[placeholder*="comment" i]', {
      timeout: 5000,
    });

    // Add a comment
    const commentText = `Test comment ${Date.now()}`;
    await page.fill('textarea[placeholder*="comment" i]', commentText);
    await page.click('button:has-text("comment"), button[type="submit"]');

    // Verify comment appears
    await expect(page.locator(`text=${commentText}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should add emoji reaction to a post', async ({ page }) => {
    await page.goto('/');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    // Open reaction picker
    await page.click('button[aria-label*="react" i], button:has-text("😊")');

    // Select an emoji
    await page.click('button:has-text("❤️")');

    // Verify reaction was added
    await expect(page.locator('text=❤️')).toBeVisible();
  });

  test('should view post details', async ({ page }) => {
    await page.goto('/');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    // Get post title
    const firstPost = page.locator('[data-testid="post-card"], article').first();
    const postTitle = await firstPost
      .locator('h2, h3, [data-testid="post-title"]')
      .first()
      .textContent();

    // Click on post
    await firstPost.click();

    // Verify we're on post detail page
    await expect(page.locator(`text=${postTitle}`)).toBeVisible();
    await expect(page.locator('text=/comment|share|save/i')).toBeVisible();
  });

  test('should filter posts by category', async ({ page }) => {
    await page.goto('/');

    // Click on a category filter
    await page.click('button:has-text("Tech"), a[href*="category=tech"]');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // Verify URL contains category parameter
    expect(page.url()).toContain('tech');
  });

  test('should search for posts', async ({ page }) => {
    await page.goto('/');

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i]');

    // Type search query
    await searchInput.fill('react');
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForLoadState('networkidle');

    // Verify search results are displayed
    await expect(page.locator('text=/search|results/i')).toBeVisible();
  });

  test('should paginate through posts', async ({ page }) => {
    await page.goto('/');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    // Scroll to bottom to trigger infinite scroll or click next page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for more posts to load
    await page.waitForTimeout(2000);

    // Verify more posts loaded
    const postCount = await page
      .locator('[data-testid="post-card"], article')
      .count();
    expect(postCount).toBeGreaterThan(5);
  });

  test('should edit own post', async ({ page }) => {
    // First create a post
    await page.click('text=/create|new post/i');

    const postTitle = `Editable Post ${Date.now()}`;
    await page.fill('input[placeholder*="title" i]', postTitle);
    await page.fill(
      'textarea, [contenteditable="true"]',
      'Original content'
    );
    await page.click('button[type="submit"], button:has-text("publish")');

    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Find the post and click edit
    await page.click(`text=${postTitle}`);
    await page.click('button:has-text("edit"), button[aria-label*="edit" i]');

    // Edit the content
    await page.fill(
      'textarea, [contenteditable="true"]',
      'Updated content'
    );
    await page.click('button:has-text("save"), button[type="submit"]');

    // Verify content updated
    await expect(page.locator('text=Updated content')).toBeVisible();
  });

  test('should delete own post', async ({ page }) => {
    // Create a post to delete
    await page.click('text=/create|new post/i');

    const postTitle = `Post to Delete ${Date.now()}`;
    await page.fill('input[placeholder*="title" i]', postTitle);
    await page.fill('textarea, [contenteditable="true"]', 'Content to delete');
    await page.click('button[type="submit"], button:has-text("publish")');

    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Find and click on the post
    await page.click(`text=${postTitle}`);

    // Click delete button
    await page.click('button:has-text("delete"), button[aria-label*="delete" i]');

    // Confirm deletion
    await page.click('button:has-text("confirm"), button:has-text("yes")');

    // Verify post is deleted
    await expect(page.locator(`text=${postTitle}`)).not.toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Post Viewing (Unauthenticated)', () => {
  test('should view posts without signing in', async ({ page }) => {
    await page.goto('/');

    // Posts should be visible
    await expect(
      page.locator('[data-testid="post-card"], article').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should prompt to sign in when trying to like', async ({ page }) => {
    await page.goto('/');

    // Wait for posts
    await page.waitForSelector('[data-testid="post-card"], article', {
      timeout: 10000,
    });

    // Try to like a post
    await page.click('button:has-text("👍"), button[aria-label*="like" i]');

    // Should show sign in modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=/sign in/i')).toBeVisible();
  });
});
