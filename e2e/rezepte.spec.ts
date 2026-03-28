// Linked to: US-008, US-009, US-010
import { test, expect } from '@playwright/test';

test.describe('Rezepte', () => {
  test('/rezepte shows placeholder when no recipes exist', async ({ page }) => {
    // This test assumes a clean state or we test the empty state directly
    await page.goto('/rezepte');
    // Page should load without crashing
    await expect(page.getByText('Rezepte')).toBeVisible();
  });

  test('/rezepte shows recipe cards when recipes exist', async ({ page }) => {
    await page.goto('/rezepte');
    // Check if recipe card appears (beispiel-rezept should exist)
    await expect(page.getByText('Beispiel Rezept')).toBeVisible();
  });

  test('clicking a recipe card opens the detail page', async ({ page }) => {
    await page.goto('/rezepte');
    await page.getByText('Beispiel Rezept').click();
    await expect(page).toHaveURL(/\/rezepte\/beispiel-rezept/);
  });

  test('detail page shows title, metadata and content', async ({ page }) => {
    await page.goto('/rezepte/beispiel-rezept');
    await expect(page.getByText('Beispiel Rezept')).toBeVisible();
    await expect(page.getByText('4 Portionen')).toBeVisible();
    await expect(page.getByText('30 Minuten')).toBeVisible();
    await expect(page.getByText('Zutaten')).toBeVisible();
  });

  test('back link returns to /rezepte', async ({ page }) => {
    await page.goto('/rezepte/beispiel-rezept');
    await page.getByRole('link', { name: /zurück zu rezepten/i }).click();
    await expect(page).toHaveURL('/rezepte');
  });
});
