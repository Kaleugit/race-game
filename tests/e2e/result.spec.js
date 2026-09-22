import { test, expect } from '@playwright/test';
import { formatDelta } from '../../src/ui/format.js';
import { trackErrors, waitCountdown, driveToFinish, resultSeconds } from './drive.js';

// CA-006: the result screen shows the signed difference player − bot with 2 decimals, and it is the
// formatDelta of the two times it displays (raw values in data-seconds). Short hidden test stage.
test('CA-006: #end-delta = formatDelta(tempo do jogador, tempo do bot)', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?stage=teste-plano');
  await page.locator('#lobby-play').click();
  await waitCountdown(page);
  await driveToFinish(page, { timeout: 60_000 });

  const { player, bot } = await resultSeconds(page);
  expect(Number.isFinite(player) && player > 0).toBe(true);
  expect(Number.isFinite(bot) && bot > 0).toBe(true);

  const delta = page.locator('#end-delta');
  await expect(delta).toBeVisible();
  await expect(delta).toHaveText(/^[+-]\d+\.\d{2}s$/);
  await expect(delta).toHaveText(formatDelta(player, bot));
  // Displayed times are the same values, 2 decimals.
  await expect(page.locator('#end-player-time')).toHaveText(`${player.toFixed(2)}s`);
  await expect(page.locator('#end-bot-time')).toHaveText(`${bot.toFixed(2)}s`);
  await expect(page.locator('#end-result')).toHaveText(player < bot ? 'VITÓRIA' : 'DERROTA');
  expect(errors).toEqual([]);
});
