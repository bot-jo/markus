// Linked to: US-011
import { test, expect } from '@playwright/test';

test.describe('Impostor Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/markus/impostor-game');
  });

  test('/markus/impostor-game renders heading "Impostor Game"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Impostor Game' })).toBeVisible();
  });

  test('placeholder text "Inhalte folgen bald." is visible', async ({ page }) => {
    await expect(page.getByText('Inhalte folgen bald.')).toBeVisible();
  });
});
