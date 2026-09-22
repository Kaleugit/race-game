import { test, expect } from '@playwright/test';
import { trackErrors } from './drive.js';

// EP-008-12: a yellow "!" warning sign stands 20 m before every hazard zone.
// Checked from the rendered pixels (no production test hook): the stage teste-plano has a sand
// zone at x=60 (sign at 40) and a mud zone at x=120 (sign at 100). The ortho camera shows
// ~17.8 m of track, so a sign 20 m ahead is still off screen and the same screen band is empty.

// Screen band that holds the sign's plate while it is 2–8 m ahead of the car, well clear of
// every HUD overlay (race bar ~y28, gauges top-left, in-race buttons y<120, hint at the bottom).
const BAND = { x: 690, y: 235, width: 590, height: 140 };

// Sign yellow (0xffc61a lit + emissive) does not occur in the sky, the road or the background photo.
async function signPixels(page) {
  const shot = await page.screenshot({ clip: BAND });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (r > 185 && g > 110 && g < 225 && b < 110 && r - b > 110) n++;
    }
    return n;
  }, shot.toString('base64'));
}

const distance = (page) => page.evaluate(() => Number(document.getElementById('dist').textContent));

async function tap(page, key, hold, rest) {
  await page.keyboard.down(key);
  await page.waitForTimeout(hold);
  await page.keyboard.up(key);
  await page.waitForTimeout(rest);
}

/** Brakes until the distance stops changing and returns that standing position. */
async function stop(page) {
  let prev = -1;
  for (let i = 0; i < 40; i++) {
    const d = await distance(page);
    if (d === prev) return d;
    prev = d;
    await tap(page, 'ArrowDown', 90, 110);
  }
  return distance(page);
}

/**
 * Creeps the car to `target` metres and stops it there. Braking cannot undo an overshoot (the car
 * never drives backwards), so the approach stops short and nudges: throttle bursts while far, then
 * short taps from a standstill until the car rests within 2 m before `target`.
 */
async function driveTo(page, target) {
  for (let i = 0; i < 400; i++) {
    const d = await distance(page);
    if (d >= target - 8) break;
    await tap(page, 'ArrowUp', 200, 60);
  }
  for (let i = 0; i < 120; i++) {
    const d = await stop(page);
    if (d >= target - 2) return d;
    await tap(page, 'ArrowUp', d < target - 5 ? 70 : 40, 120);
  }
  return stop(page);
}

test('placa de "!" visível 20 m antes da areia e antes da lama', async ({ page }) => {
  test.slow(); // creeping to three exact positions costs more than the default budget
  const errors = trackErrors(page);
  await page.goto('/?stage=teste-plano');
  await page.locator('#lobby-play').click();
  await expect(page.locator('#countdown-overlay')).toHaveClass(/\bshow\b/);
  await expect(page.locator('#countdown-overlay')).not.toHaveClass(/\bshow\b/, { timeout: 20_000 });

  // Empty stretch: the first sign (x=40) is still 20+ m ahead, so nothing shows in the band.
  const atEmpty = await driveTo(page, 15);
  expect(atEmpty, 'position for the empty reference frame').toBeLessThanOrEqual(18);
  expect(await signPixels(page), 'sign pixels with no hazard ahead').toBeLessThan(200);

  // 20 m before the sand at x=60: the sign is in view, a few metres ahead of the car.
  const atSand = await driveTo(page, 35);
  expect(atSand, 'position before the sand sign').toBeGreaterThanOrEqual(33);
  expect(atSand, 'position before the sand sign').toBeLessThanOrEqual(38);
  expect(await signPixels(page), 'sign pixels before the sand at x=60').toBeGreaterThan(1500);

  // 20 m before the mud at x=120: a second, separate sign.
  const atMud = await driveTo(page, 95);
  expect(atMud, 'position before the mud sign').toBeGreaterThanOrEqual(93);
  expect(atMud, 'position before the mud sign').toBeLessThanOrEqual(98);
  expect(await signPixels(page), 'sign pixels before the mud at x=120').toBeGreaterThan(1500);

  expect(errors).toEqual([]);
});
