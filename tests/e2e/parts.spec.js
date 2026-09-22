import { test, expect } from '@playwright/test';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { DEFAULT_PARTS, resolveCarParams } from '../../src/parts/presets.js';
import { trackErrors, openGarageFromLobby, pickGarage, confirmGarage, startStageFromMap } from './drive.js';

// EP-008-04: engine / chassis / turbo tank are chosen in the garage, survive a reload and reach the
// race (resolved physics params exposed on #hud, turbo gauge sized by the tank capacity).
const PARTS = { engine: 'e24', chassis: 'pesado', tank: 'grande' };
const ROWS = { engine: 'garage-engines', chassis: 'garage-chassis', tank: 'garage-tanks' };

async function expectParts(page, parts) {
  for (const [key, id] of Object.entries(parts)) {
    await expect(page.locator(`#${ROWS[key]} [data-${key}="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`#${ROWS[key]} [aria-pressed="true"]`)).toHaveCount(1);
  }
}

test('RF-012: motor/chassi/tanque sobrevivem ao reload e chegam à corrida', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await openGarageFromLobby(page);
  await expectParts(page, { engine: DEFAULT_PARTS.engine, chassis: DEFAULT_PARTS.chassis, tank: DEFAULT_PARTS.tank });
  // Every option shows a trade-off label.
  for (const row of Object.values(ROWS)) {
    await expect(page.locator(`#${row} .garage-opt`)).toHaveCount(3);
    for (const label of await page.locator(`#${row} .opt-trade`).allTextContents()) expect(label).toMatch(/%/);
  }

  await pickGarage(page, PARTS);
  await expectParts(page, PARTS);
  await confirmGarage(page);
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('race_profile_v1')));
  expect(saved.garage).toMatchObject(PARTS);

  await page.reload();
  await openGarageFromLobby(page);
  await expectParts(page, PARTS);
  await confirmGarage(page);
  await startStageFromMap(page, 'mata-atlantica');

  const expected = resolveCarParams(BASE_PARAMS, { ...DEFAULT_PARTS, ...PARTS });
  const hud = page.locator('#hud');
  await expect(hud).toHaveAttribute('data-engine', PARTS.engine);
  await expect(hud).toHaveAttribute('data-turbo-capacity', String(expected.turboCapacity));
  await expect(hud).toHaveAttribute('data-mass', String(expected.mass));
  // Grande tank = 12 * 1.4 = 17 segments in the turbo gauge (default tank: 12), each one drawn.
  const turbo = page.locator('#turbo-gauge');
  await expect(turbo).toBeVisible();
  await expect(turbo).toHaveAttribute('data-segments', '17');
  await expect(turbo.locator('.turbo-seg')).toHaveCount(17);
  for (const box of await turbo.locator('.turbo-seg').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
    expect(box.width * box.height).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 640, height: 360 }, { width: 740, height: 360 }]) {
  test(`garagem cabe em mobile landscape ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await openGarageFromLobby(page);
    const panel = page.locator('#garage-panel');
    const fits = await panel.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1);
    expect(fits).toBe(true);
    for (const sel of ['#garage-confirm', '#garage-tanks .garage-opt', '#garage-colors .swatch']) {
      for (const box of await page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.bottom).toBeLessThanOrEqual(viewport.height);
        expect(box.right).toBeLessThanOrEqual(viewport.width);
      }
    }
    // The selected option's trade-off is still readable on short screens.
    await expect(page.locator('#garage-tanks + .garage-sel-trade')).toBeVisible();
    await expect(page.locator('#garage-tanks + .garage-sel-trade')).toContainText('TURBO');
  });
}
