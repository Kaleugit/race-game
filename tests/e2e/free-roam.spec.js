import { test, expect } from '@playwright/test';
import {
  trackErrors,
  openMapFromLobby,
  startFreeRoamFromMap,
  waitCountdown,
  driveFreeRoamToEnd,
  driveForMs,
  readProfile,
} from './drive.js';

// EP-008-13 MODO LIVRE: the map card starts a 5 km run with no opponent — no race bar, no 1º/2º
// badges, no "BOT CHEGOU" notice, no ghost even with the option on — and nothing is written to the
// profile. Reaching the end of the terrain opens the free-roam end screen (VOLTAR / DE NOVO).
// The end screen is driven on the short `livre-teste` free-roam stage (the 5 km one takes ~2.5 min).

const SHOW = /\bshow\b/;

/** Everything the race flow shows that free roam must not. */
async function expectNoOpponent(page) {
  await expect(page.locator('#hud')).toHaveAttribute('data-mode', 'free');
  await expect(page.locator('#race-bar')).not.toHaveClass(SHOW);
  await expect(page.locator('#hud-bot-won')).toBeHidden();
  await expect(page.locator('#end-overlay')).not.toHaveClass(SHOW);
  // The ghost mesh is never enabled in free roam, whatever the map option says.
  await expect(page.locator('#hud')).toHaveAttribute('data-ghost', 'off');
}

test('MODO LIVRE pelo mapa: dirige sem bot e sem gravar progresso', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  const before = await readProfile(page);

  await openMapFromLobby(page);
  const card = page.locator('#map-free');
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-stage-id', 'terra-livre');
  // Always available: it is a mode, never a locked rung of the ladder.
  await expect(card).not.toHaveAttribute('data-locked', 'true');
  await expect(card).toBeEnabled();
  await expect(page.locator('#map-free-sub')).toContainText('5.0 km');

  await startFreeRoamFromMap(page);
  await expectNoOpponent(page);

  await driveForMs(page, 4000);
  const dist = Number(await page.locator('#dist').textContent());
  expect(dist, 'the car moved on the free-roam terrain').toBeGreaterThan(20);
  await expectNoOpponent(page);

  // Free roam never touches race_profile_v1 (no win, no best time, no unlock).
  expect(await readProfile(page)).toBe(before);

  // The in-race LOBBY button leaves the run at any point.
  await page.locator('#btn-back-lobby').click();
  await expect(page.locator('#lobby-play')).toBeVisible();
  expect(await readProfile(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('MODO LIVRE: a opção BOT FANTASMA não coloca fantasma nenhum na pista', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await openMapFromLobby(page);
  await page.locator('#map-ghost').click();
  await expect(page.locator('#map-ghost')).toHaveAttribute('data-ghost', 'on');

  await startFreeRoamFromMap(page);
  await expectNoOpponent(page);
  expect(errors).toEqual([]);
});

test('MODO LIVRE: chegar ao fim abre a tela FIM DO PERCURSO com DE NOVO e VOLTAR', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?stage=livre-teste');
  const before = await readProfile(page);

  await page.locator('#lobby-play').click();
  await waitCountdown(page);
  await expectNoOpponent(page);

  await driveFreeRoamToEnd(page, { timeout: 60_000 });
  // No victory, no defeat, no opponent time: the race result screen never opens.
  await expect(page.locator('#end-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#free-end-dist')).toHaveAttribute('data-metres', '180');
  const seconds = Number(await page.locator('#free-end-time').getAttribute('data-seconds'));
  expect(seconds).toBeGreaterThan(0);
  // Finishing a free-roam run writes nothing: no best time, no unlock.
  expect(await readProfile(page)).toBe(before);

  // DE NOVO: same terrain, straight back into the countdown.
  await page.locator('#free-end-again').click();
  await expect(page.locator('#free-end-overlay')).not.toHaveClass(SHOW);
  await waitCountdown(page);
  await expectNoOpponent(page);

  // VOLTAR: back to the lobby home.
  await driveFreeRoamToEnd(page, { timeout: 60_000 });
  await page.locator('#free-end-back').click();
  await expect(page.locator('#free-end-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#lobby-play')).toBeVisible();
  await expect(page.locator('#lobby-garage')).toBeVisible();
  expect(await readProfile(page)).toBe(before);
  expect(errors).toEqual([]);
});
