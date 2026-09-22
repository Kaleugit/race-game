import { test, expect } from '@playwright/test';
import {
  trackErrors, openGarageFromLobby, pickGarage, confirmGarage, startStageFromMap, waitCountdown, driveToFinish, resultSeconds,
} from './drive.js';

// CA-001: full flow without reloads and without page/console errors.
// Every exit of the result screen (MAPA, GARAGEM, REVANCHE) leads back into a new race.
// Mata Atlântica races take ~71 s with Estrada + Longa and the reference turbo policy (drive.js);
// REVANCHE is exercised on the short hidden test stage to keep the suite runtime down (same
// onRematch -> startCountdown path for every stage).
const SHOW = /\bshow\b/;

async function expectResult(page) {
  await expect(page.locator('#end-result')).toHaveText(/^(VITÓRIA|DERROTA)$/);
  for (const id of ['#end-play-again', '#end-map', '#end-garage']) await expect(page.locator(id)).toBeVisible();
}

test('CA-001: lobby -> garagem -> mapa -> corrida -> resultado -> mapa -> corrida -> resultado -> garagem -> corrida', async ({ page }) => {
  test.setTimeout(330_000);
  const errors = trackErrors(page);

  await page.goto('/');
  await openGarageFromLobby(page);
  await pickGarage(page, { tire: 'estrada', gearbox: 'longa' });
  await confirmGarage(page);
  await startStageFromMap(page, 'mata-atlantica');
  await expect(page.locator('#race-bar-stage')).toHaveText('MATA ATLÂNTICA');
  await driveToFinish(page);
  await expectResult(page);

  // Result -> MAPA -> race -> result.
  await page.locator('#end-map').click();
  await expect(page.locator('#end-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#map-overlay')).toHaveClass(SHOW);
  await startStageFromMap(page, 'mata-atlantica');
  await driveToFinish(page);
  await expectResult(page);

  // Result -> GARAGEM (reopens with the saved choice) -> map -> race running.
  await page.locator('#end-garage').click();
  await expect(page.locator('#end-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#garage-overlay')).toHaveClass(SHOW);
  await expect(page.locator('#garage-tires [data-tire="estrada"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-gearboxes [data-gearbox="longa"]')).toHaveAttribute('aria-pressed', 'true');
  await confirmGarage(page);
  await startStageFromMap(page, 'mata-atlantica');
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => Number(await page.locator('#dist').textContent()), { timeout: 15_000 }).toBeGreaterThan(20);
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#end-overlay')).not.toHaveClass(SHOW);

  expect(errors).toEqual([]);
});

test('CA-001: resultado -> REVANCHE -> nova corrida -> resultado', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?stage=teste-plano');
  await page.locator('#lobby-play').click();
  await waitCountdown(page);
  await driveToFinish(page, { timeout: 60_000 });
  await expectResult(page);
  const first = await resultSeconds(page);

  await page.locator('#end-play-again').click();
  await expect(page.locator('#end-overlay')).not.toHaveClass(SHOW);
  await waitCountdown(page);
  await expect(page.locator('#race-bar-stage')).toHaveText('TESTE PLANO');
  await driveToFinish(page, { timeout: 60_000 });
  await expectResult(page);
  const second = await resultSeconds(page);
  expect(Number.isFinite(second.player) && Number.isFinite(second.bot)).toBe(true);
  // New race, new clock: the second result is a fresh measurement, not the first one left on screen.
  expect(second).not.toEqual(first);

  expect(errors).toEqual([]);
});
