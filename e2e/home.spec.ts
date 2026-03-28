// Linked to: US-004, US-005, US-006, US-007
import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/markus/');
  });

  test('hero section with "Jo" is visible', async ({ page }) => {
    await expect(page.locator('main').getByText('Jo').first()).toBeVisible();
    await expect(page.locator('main').getByText('Dein persönlicher AI-Assistent')).toBeVisible();
  });

  test('all four capability cards are visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Email Management' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Calendar Management' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shopping List' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'This GitHub Page' })).toBeVisible();
  });

  test('CTA button is visible and has correct href', async ({ page }) => {
    const ctaButton = page.getByRole('link', { name: /github repository/i });
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toHaveAttribute('href', 'https://github.com/bot-jo/markus');
  });

  test('"View Docs & Wiki" link is visible on GitHub Page card', async ({ page }) => {
    const wikiLink = page.getByRole('link', { name: /view docs & wiki/i });
    await expect(wikiLink).toBeVisible();
    await expect(wikiLink).toHaveAttribute('href', 'https://github.com/bot-jo/markus/wiki');
  });
});
