import { test, expect } from '@playwright/test';
import { DEFAULT_COLOR } from '../../src/parts/colors.js';
import { DEFAULT_PARTS } from '../../src/parts/presets.js';
import { trackErrors, openGarageFromLobby, pickGarage, confirmGarage } from './drive.js';

// CA-007: the garage choice (color, tire, gearbox) survives a reload. The "bot does not inherit the
// player's choice" half is covered by tests/sim/bot.test.js ('resolveBotParams: stage data only,
// never the garage choice'): the bot has no on-track mesh, so the DOM has nothing to assert (epic DA-008).
const CHOICE = { color: 'azul', tire: 'offroad', gearbox: 'curta' };

async function expectSelected(page, { color, tire, gearbox }) {
  await expect(page.locator(`#garage-colors [data-color-id="${color}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`#garage-tires [data-tire="${tire}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`#garage-gearboxes [data-gearbox="${gearbox}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-colors [aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('#garage-tires [aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('#garage-gearboxes [aria-pressed="true"]')).toHaveCount(1);
}

test('CA-007: cor/pneu/câmbio escolhidos sobrevivem ao reload', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await openGarageFromLobby(page);
  await expectSelected(page, { color: DEFAULT_COLOR, ...DEFAULT_PARTS });

  await pickGarage(page, CHOICE);
  await expectSelected(page, CHOICE);
  await expect(page.locator('#garage-color-name')).toHaveText('AZUL');
  await confirmGarage(page);

  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('race_profile_v1')));
  expect(saved.garage).toMatchObject(CHOICE);

  await page.reload();
  await openGarageFromLobby(page);
  await expectSelected(page, CHOICE);
  await expect(page.locator('#garage-color-name')).toHaveText('AZUL');
  expect(errors).toEqual([]);
});
