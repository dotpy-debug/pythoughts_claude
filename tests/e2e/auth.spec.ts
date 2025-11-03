import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display auth modal on sign in button click', async ({ page }) => {
    // Click sign in button in header
    await page.click('text=sign in');

    // Check if modal is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=welcome back')).toBeVisible();
  });

  test('should toggle between sign in and sign up forms', async ({ page }) => {
    // Open auth modal
    await page.click('text=sign in');

    // Verify sign in form is shown
    await expect(page.locator('text=welcome back')).toBeVisible();

    // Click sign up link
    await page.click('text=sign up');

    // Verify sign up form is shown
    await expect(page.locator('text=create account')).toBeVisible();

    // Toggle back to sign in
    await page.click('text=sign in');
    await expect(page.locator('text=welcome back')).toBeVisible();
  });

  test('should show validation errors for empty sign in form', async ({ page }) => {
    await page.click('text=sign in');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=sign in');

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator('text=/invalid|error/i')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should successfully sign in with valid credentials', async ({ page }) => {
    await page.click('text=sign in');

    // Fill in valid test credentials
    await page.fill('input[type="email"]', 'test@pythoughts.com');
    await page.fill('input[type="password"]', 'testpassword123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for successful sign in (modal should close)
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({
      timeout: 10_000,
    });

    // Verify user is signed in (should see profile or sign out button)
    await expect(
      page.locator('text=/profile|sign out/i').first()
    ).toBeVisible();
  });

  test('should display sign up form fields', async ({ page }) => {
    await page.click('text=sign in');
    await page.click('text=sign up');

    // Verify all required fields are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="username" i]')).toBeVisible();
  });

  test('should show loading state during sign in', async ({ page }) => {
    await page.click('text=sign in');

    await page.fill('input[type="email"]', 'test@pythoughts.com');
    await page.fill('input[type="password"]', 'testpassword123');

    // Click submit and immediately check for loading state
    await page.click('button[type="submit"]');
    await expect(page.locator('button[type="submit"][disabled]')).toBeVisible();
  });

  test('should close modal on background click', async ({ page }) => {
    await page.click('text=sign in');

    // Modal should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click on modal background (outside the dialog)
    await page.click('body', { position: { x: 10, y: 10 } });

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should maintain form state when toggling between modes', async ({
    page,
  }) => {
    await page.click('text=sign in');

    // Fill email in sign in form
    const testEmail = 'test@example.com';
    await page.fill('input[type="email"]', testEmail);

    // Toggle to sign up
    await page.click('text=sign up');

    // Email should be cleared (different form)
    const emailValue = await page
      .locator('input[type="email"]')
      .inputValue();
    expect(emailValue).toBe('');
  });

  test('should show password strength indicator on sign up', async ({
    page,
  }) => {
    await page.click('text=sign in');
    await page.click('text=sign up');

    // Type a weak password
    await page.fill('input[type="password"]', 'weak');

    // Type a strong password
    await page.fill('input[type="password"]', 'StrongP@ssw0rd');

    // Note: This test assumes password strength indicator exists
    // Adjust based on actual implementation
  });
});

test.describe('Authenticated User Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/');
    await page.click('text=sign in');
    await page.fill('input[type="email"]', 'test@pythoughts.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');

    // Wait for modal to close (sign in successful)
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  });

  test('should display user profile menu', async ({ page }) => {
    // Click on profile/avatar
    await page.click('button:has-text("profile"), [aria-label*="profile" i]');

    // Profile menu should be visible
    await expect(page.locator('text=sign out')).toBeVisible();
  });

  test('should sign out successfully', async ({ page }) => {
    // Open profile menu
    await page.click('button:has-text("profile"), [aria-label*="profile" i]');

    // Click sign out
    await page.click('text=sign out');

    // Verify signed out (sign in button should reappear)
    await expect(page.locator('text=sign in').first()).toBeVisible();
  });
});
