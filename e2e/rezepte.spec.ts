// Linked to: US-008, US-009, US-010
import { test, expect } from '@playwright/test';

test.describe('Rezepte', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/markus/rezepte');
  });

  test('/markus/rezepte shows recipe cards when recipes exist', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Rezepte' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bohnenbällchen' })).toBeVisible();
  });

  test('clicking a recipe card opens the detail page', async ({ page }) => {
    await page.getByRole('heading', { name: 'Bohnenbällchen' }).click();
    await expect(page).toHaveURL(/\/markus\/rezepte\/bohnenballchen/);
  });

  test('detail page shows title and content', async ({ page }) => {
    await page.goto('/markus/rezepte/bohnenballchen');
    await expect(page.getByRole('heading', { name: 'Bohnenbällchen' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zutaten' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zubereitung' })).toBeVisible();
  });

  test('back link returns to /markus/rezepte', async ({ page }) => {
    await page.goto('/markus/rezepte/bohnenballchen');
    await page.getByRole('link', { name: /zurück zu rezepten/i }).click();
    await expect(page).toHaveURL('/markus/rezepte');
  });
});
