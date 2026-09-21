import { test, expect } from '@playwright/test';

// Smoke: Lobby -> countdown -> race -> end overlay, with no page errors.
test('fluxo atual: lobby -> corrida -> resultado', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.goto('/');
  await page.locator('#lobby-play').click();

  const countdown = page.locator('#countdown-overlay');
  await expect(countdown).toHaveClass(/\bshow\b/);
  await expect(countdown).not.toHaveClass(/\bshow\b/, { timeout: 15_000 });

  await page.keyboard.down('ArrowUp');
  const end = page.locator('#end-overlay');
  await expect(end).toHaveClass(/\bshow\b/, { timeout: 60_000 });
  await page.keyboard.up('ArrowUp');

  await expect(page.locator('#end-result')).toHaveText(/^(VITÓRIA|DERROTA)$/);
  expect(errors).toEqual([]);
});
