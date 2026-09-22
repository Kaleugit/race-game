import { test, expect } from '@playwright/test';
import { trackErrors, openMapFromLobby, waitCountdown } from './drive.js';

// EP-008-11 (BOT FANTASMA): the map screen carries an on/off toggle, off by default, persisted in
// the profile (it survives a reload), and it decides whether the opponent is drawn on the track as a
// translucent ghost. Proven on the real pixels: the ghost is the only cold-blue thing on the ochre
// road/field of `teste-plano`, so counting its signature in a road-band clip separates on from off
// (measured 2026-09-22: on = thousands of pixels per frame, off = exactly zero).
//
// Recalibrate CLIP / SIGNATURE if the camera, VIEW_H, GHOST_TUNING or the teste-plano background change.
const CLIP = { x: 0, y: 400, width: 1280, height: 260 };
const MIN_GHOST_PIXELS = 500; // measured 2607..10146 with the ghost on
const MAX_NOISE_PIXELS = 50; // measured 0 with the ghost off

/** Counts pixels with the ghost's cold-blue signature inside CLIP of the current frame. */
async function ghostPixels(page) {
  const b64 = (await page.screenshot({ clip: CLIP })).toString('base64');
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data: px } = ctx.getImageData(0, 0, c.width, c.height);
    let n = 0;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i]; const g = px[i + 1]; const b = px[i + 2];
      if (b > 70 && b - r > 40 && g - r > 22 && b >= g) n++;
    }
    return n;
  }, b64);
}

/**
 * Runs the first seconds of a `teste-plano` race with the throttle held (the player then keeps the
 * bot's early pace, so a ghost stays on screen) and returns the per-frame signature counts.
 */
async function raceAndSample(page, frames = 12) {
  await page.locator('#lobby-play').click();
  await waitCountdown(page);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }));
  });
  const counts = [];
  for (let i = 0; i < frames; i++) {
    counts.push(await ghostPixels(page));
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }));
  });
  return counts;
}

test('bot fantasma ligado no mapa: escolha persiste no recarregamento e o fantasma aparece na pista', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await openMapFromLobby(page);

  // Default is off (today's behaviour: the bot only shows on the race bar).
  const toggle = page.locator('#map-ghost');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('data-ghost', 'off');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#map-ghost-value')).toHaveText('DESLIGADO');

  await toggle.click();
  await expect(toggle).toHaveAttribute('data-ghost', 'on');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#map-ghost-value')).toHaveText('LIGADO');

  // Persisted in the profile: a full reload brings the map back with the option still on.
  await page.reload();
  await openMapFromLobby(page);
  await expect(page.locator('#map-ghost')).toHaveAttribute('data-ghost', 'on');
  await expect(page.locator('#map-ghost-value')).toHaveText('LIGADO');

  // Same saved choice on the short test stage: the ghost is rendered on the track.
  await page.goto('/?stage=teste-plano');
  const counts = await raceAndSample(page);
  await expect(page.locator('#hud')).toHaveAttribute('data-ghost', 'on');
  const seen = counts.filter((n) => n > MIN_GHOST_PIXELS);
  expect(seen.length, `frames with a ghost: ${counts.join(',')}`).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

test('bot fantasma desligado (padrão): nenhum fantasma é desenhado na pista', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await openMapFromLobby(page);
  await expect(page.locator('#map-ghost')).toHaveAttribute('data-ghost', 'off');
  await expect(page.locator('#map-ghost-value')).toHaveText('DESLIGADO');

  await page.goto('/?stage=teste-plano');
  const counts = await raceAndSample(page);
  await expect(page.locator('#hud')).toHaveAttribute('data-ghost', 'off');
  expect(Math.max(...counts), `frames without a ghost: ${counts.join(',')}`).toBeLessThan(MAX_NOISE_PIXELS);
  // The race itself still runs: the bot marker moves on the race bar as before.
  await expect.poll(async () => parseFloat(await page.locator('#race-bar-bot').evaluate((e) => e.style.left)))
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
