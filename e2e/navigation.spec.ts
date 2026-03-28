// Linked to: US-001, US-002, US-003
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('logo "Jo" is visible on home page', async ({ page }) => {
    await page.goto('/markus/');
    await expect(page.locator('header').getByText('Jo')).toBeVisible();
  });

  test('click "Rezepte" nav link — navigates to /markus/rezepte', async ({ page }) => {
    await page.goto('/markus/');
    await page.getByRole('link', { name: 'Rezepte' }).click();
    await expect(page).toHaveURL('/markus/rezepte');
  });

  test('click "Impostor Game" nav link — navigates to /markus/impostor-game', async ({ page }) => {
    await page.goto('/markus/');
    await page.getByRole('link', { name: 'Impostor Game' }).click();
    await expect(page).toHaveURL('/markus/impostor-game');
  });

  test('click logo — navigates to home', async ({ page }) => {
    await page.goto('/markus/rezepte');
    await page.locator('header').getByRole('link', { name: 'Jo' }).click();
    await expect(page).toHaveURL(/\/markus\/?$/);
  });

  test('footer is visible on home page', async ({ page }) => {
    await page.goto('/markus/');
    await expect(page.locator('footer')).toBeVisible();
  });

  test('footer is visible on /markus/rezepte', async ({ page }) => {
    await page.goto('/markus/rezepte');
    await expect(page.locator('footer')).toBeVisible();
  });

  test('footer is visible on /markus/impostor-game', async ({ page }) => {
    await page.goto('/markus/impostor-game');
    await expect(page.locator('footer')).toBeVisible();
  });
});
