import { test, expect } from '@playwright/test';

test.describe('Mock PMS browser flows', () => {
  test('staff can log in to PMS dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'staff');
    await page.fill('[name="password"]', 'InnFlow2025!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|rooms|home/i);
  });

  test('displays seeded rooms list', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'staff');
    await page.fill('[name="password"]', 'InnFlow2025!');
    await page.click('button[type="submit"]');
    await page.goto('/rooms');
    await expect(page.locator('[data-testid="room-row"], .room-row, tr')).not.toHaveCount(0);
  });

  test('creates housekeeping request via UI', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'staff');
    await page.fill('[name="password"]', 'InnFlow2025!');
    await page.click('button[type="submit"]');
    await page.goto('/housekeeping/new');
    await page.fill('[name="roomNumber"]', '305');
    await page.fill('[name="item"]', 'Extra towels');
    await page.fill('[name="quantity"]', '2');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success, [data-testid="success-message"]')).toBeVisible({
      timeout: 15_000,
    });
  });
});
