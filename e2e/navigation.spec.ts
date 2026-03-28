// Linked to: US-001, US-002, US-003
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('logo "Jo" is visible on home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Jo').first()).toBeVisible();
  });

  test('click "Rezepte" nav link — navigates to /rezepte', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Rezepte' }).click();
    await expect(page).toHaveURL('/rezepte');
  });

  test('click "Impostor Game" nav link — navigates to /impostor-game', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Impostor Game' }).click();
    await expect(page).toHaveURL('/impostor-game');
  });

  test('click logo — navigates to home', async ({ page }) => {
    await page.goto('/rezepte');
    await page.getByRole('link', { name: 'Jo' }).first().click();
    await expect(page).toHaveURL('/');
  });

  test('footer is visible on all three pages', async ({ page }) => {
    const footer = page.locator('footer');
    await page.goto('/');
    await expect(footer).toBeVisible();

    await page.goto('/rezepte');
    await expect(footer).toBeVisible();

    await page.goto('/impostor-game');
    await expect(footer).toBeVisible();
  });
});
