// Linked to: US-011
import { test, expect } from '@playwright/test';

test.describe('Impostor Game', () => {
  test('/impostor-game renders heading "Impostor Game"', async ({ page }) => {
    await page.goto('/impostor-game');
    await expect(page.getByText('Impostor Game')).toBeVisible();
  });

  test('placeholder text "Inhalte folgen bald." is visible', async ({ page }) => {
    await page.goto('/impostor-game');
    await expect(page.getByText('Inhalte folgen bald.')).toBeVisible();
  });
});
