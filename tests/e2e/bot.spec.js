import { test, expect } from '@playwright/test';

// EP-004-02: the opponent is a real bot car (physics + AI inputs), not a fixed-time ghost.
// An idle player on the short test stage must lose to the bot, and the bot time must be real.
test('bot real: jogador parado em ?stage=teste-plano -> DERROTA com tempo do bot', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.goto('/?stage=teste-plano');
  await page.locator('#lobby-play').click();

  // No key is pressed at any point: only the bot drives.
  const end = page.locator('#end-overlay');
  await expect(end).toHaveClass(/\bshow\b/, { timeout: 60_000 });

  await expect(page.locator('#end-result')).toHaveText('DERROTA');
  await expect(page.locator('#end-bot-time')).toHaveText(/^\d+(\.\d+)?s$/);
  expect(errors).toEqual([]);
});
