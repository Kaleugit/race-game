import { test, expect } from '@playwright/test';

// Smoke: Lobby -> countdown -> race -> end overlay, with no page errors.
// EP-005-01 (epic DA-004): Mata Atlântica races take 60–90 s (reference driver ~74 s, the bot ~80 s,
// constant ArrowUp ~95 s of game time); the race ends when the bot or the player crosses the line.
// 150 s for the end overlay leaves margin for frame-rate jitter without hiding a hang; the test
// timeout also covers page load and the countdown.
test('fluxo atual: lobby -> corrida -> resultado', async ({ page }) => {
  test.setTimeout(210_000);
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
  await expect(end).toHaveClass(/\bshow\b/, { timeout: 150_000 });
  await page.keyboard.up('ArrowUp');

  await expect(page.locator('#end-result')).toHaveText(/^(VITÓRIA|DERROTA)$/);
  expect(errors).toEqual([]);
});
