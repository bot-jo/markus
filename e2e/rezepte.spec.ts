// Linked to: US-008, US-009, US-010
import { test, expect } from '@playwright/test';

test.describe('Rezepte', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/markus/rezepte');
  });

  test('/markus/rezepte shows recipe cards when recipes exist', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Rezepte' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Beispiel Rezept' })).toBeVisible();
  });

  test('clicking a recipe card opens the detail page', async ({ page }) => {
    await page.getByRole('heading', { name: 'Beispiel Rezept' }).click();
    await expect(page).toHaveURL(/\/markus\/rezepte\/beispiel-rezept/);
  });

  test('detail page shows title, metadata and content', async ({ page }) => {
    await page.goto('/markus/rezepte/beispiel-rezept');
    await expect(page.getByRole('heading', { name: 'Beispiel Rezept' })).toBeVisible();
    await expect(page.getByText('4 Portionen')).toBeVisible();
    await expect(page.getByText('30 Minuten')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zutaten' })).toBeVisible();
  });

  test('back link returns to /markus/rezepte', async ({ page }) => {
    await page.goto('/markus/rezepte/beispiel-rezept');
    await page.getByRole('link', { name: /zurück zu rezepten/i }).click();
    await expect(page).toHaveURL('/markus/rezepte');
  });
});
