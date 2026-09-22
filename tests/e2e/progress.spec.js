import { test, expect } from '@playwright/test';
import { trackErrors, openGarageFromLobby, pickGarage, confirmGarage, startStageFromMap, driveToFinish, resultSeconds } from './drive.js';

// CA-002: beating Mata Atlântica unlocks Cerrado on the map, and it survives a reload.
// A fresh Playwright context has an empty localStorage (clean profile). The win is a real race
// through the UI: garage Estrada + Longa (fastest legal Mata setup in the sim, ~71 s) and the
// reference turbo policy of driveToFinish (see drive.js); the bot on Mata is ~77–82 s.
test('CA-002: vencer a Mata Atlântica desbloqueia o Cerrado e persiste após reload', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);

  await page.goto('/');
  expect(await page.evaluate(() => localStorage.getItem('race_profile_v1'))).toBeNull();

  await openGarageFromLobby(page);
  await pickGarage(page, { tire: 'estrada', gearbox: 'longa' });
  await confirmGarage(page);

  // Clean storage: only Mata Atlântica is available.
  await expect(page.locator('#map-stages [data-stage-id]')).toHaveCount(2);
  await expect(page.locator('#map-stages [data-locked="false"]')).toHaveCount(1);
  await expect(page.locator('#map-stages [data-stage-id="mata-atlantica"]')).toHaveAttribute('data-locked', 'false');
  await expect(page.locator('#map-stages [data-stage-id="cerrado"]')).toHaveAttribute('data-locked', 'true');
  await expect(page.locator('#map-stages [data-stage-id="cerrado"]')).toBeDisabled();

  await startStageFromMap(page, 'mata-atlantica');
  await driveToFinish(page);
  const { player, bot } = await resultSeconds(page);
  console.log(`CA-002 Mata win: player ${player.toFixed(2)}s, bot ${bot.toFixed(2)}s`);
  await expect(page.locator('#end-result')).toHaveText('VITÓRIA');

  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('race_profile_v1')));
  expect(saved.progress.unlocked).toContain('cerrado');

  await page.reload();
  await openGarageFromLobby(page);
  await confirmGarage(page);
  await expect(page.locator('#map-stages [data-stage-id="mata-atlantica"]')).toHaveAttribute('data-locked', 'false');
  await expect(page.locator('#map-stages [data-stage-id="cerrado"]')).toHaveAttribute('data-locked', 'false');
  await expect(page.locator('#map-stages [data-stage-id="cerrado"]')).toBeEnabled();

  expect(errors).toEqual([]);
});
