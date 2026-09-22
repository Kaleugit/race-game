import { test, expect } from '@playwright/test';

// Smoke (EP-006-04 full flow): Lobby -> Garagem -> Mapa -> countdown -> race -> result, no page errors.
// Without ?stage=, JOGAR opens the garage; confirming opens the map; the first stage starts the race.
// Mata Atlântica races take 60–90 s; the result opens only when the PLAYER crosses the line (the bot
// crossing first only shows a HUD notice), so the player holds ArrowUp+Space (~93 s of game time in
// the headless harness). 150 s for the result leaves margin for frame-rate jitter without hiding a hang.
test('fluxo completo: lobby -> garagem -> mapa -> corrida -> resultado', async ({ page }) => {
  test.setTimeout(210_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.goto('/');
  await page.locator('#lobby-play').click();

  await expect(page.locator('#garage-overlay')).toHaveClass(/\bshow\b/);
  await page.locator('#garage-confirm').click();
  await expect(page.locator('#garage-overlay')).not.toHaveClass(/\bshow\b/);

  await expect(page.locator('#map-overlay')).toHaveClass(/\bshow\b/);
  await page.locator('#map-stages [data-stage-id="mata-atlantica"]').click();
  await expect(page.locator('#map-overlay')).not.toHaveClass(/\bshow\b/);

  const countdown = page.locator('#countdown-overlay');
  await expect(countdown).toHaveClass(/\bshow\b/);
  await expect(countdown).not.toHaveClass(/\bshow\b/, { timeout: 15_000 });

  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('Space');
  const end = page.locator('#end-overlay');
  await expect(end).toHaveClass(/\bshow\b/, { timeout: 150_000 });
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowUp');

  await expect(page.locator('#end-result')).toHaveText(/^(VITÓRIA|DERROTA)$/);
  expect(errors).toEqual([]);
});
