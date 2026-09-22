import { test, expect } from '@playwright/test';
import { trackErrors, openMapFromLobby } from './drive.js';

// EP-008-11: the BOT FANTASMA toggle added to the map screen never overlaps the title, the stage
// rows or the LOBBY button, everything stays inside the viewport and the panel still fits without
// scrolling, on desktop and phone landscape — in both states of the toggle (the ON state has a
// thicker, solid border than the dashed OFF state).
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 640, height: 360 },
  { width: 740, height: 360 },
];

function intersects(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

for (const viewport of VIEWPORTS) {
  test(`mapa com BOT FANTASMA sem sobreposição em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await openMapFromLobby(page);

    for (const state of ['off', 'on']) {
      await expect(page.locator('#map-ghost')).toHaveAttribute('data-ghost', state);
      const boxes = await page.evaluate(() => {
        const rect = (el) => el.getBoundingClientRect().toJSON();
        const out = {
          title: rect(document.querySelector('#map-panel .screen-title')),
          ghost: rect(document.getElementById('map-ghost')),
          back: rect(document.getElementById('map-back')),
        };
        document.querySelectorAll('#map-stages .map-stage').forEach((b, i) => { out[`stage${i}`] = rect(b); });
        return out;
      });
      const names = Object.keys(boxes);
      expect(names.filter((n) => n.startsWith('stage')).length).toBeGreaterThanOrEqual(2);
      for (const n of names) {
        const b = boxes[n];
        expect(b.right - b.left, `${n} [${state}] has width`).toBeGreaterThan(0);
        expect(b.bottom - b.top, `${n} [${state}] has height`).toBeGreaterThan(0);
        expect(b.left, `${n} [${state}] left`).toBeGreaterThanOrEqual(0);
        expect(b.top, `${n} [${state}] top`).toBeGreaterThanOrEqual(0);
        expect(b.right, `${n} [${state}] right`).toBeLessThanOrEqual(viewport.width);
        expect(b.bottom, `${n} [${state}] bottom`).toBeLessThanOrEqual(viewport.height);
      }
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          expect(intersects(boxes[names[i]], boxes[names[j]]), `${names[i]} x ${names[j]} [${state}]`).toBe(false);
        }
      }
      // The panel needs no scrolling and every control is fully reachable.
      const fits = await page.locator('#map-panel').evaluate((e) => e.scrollHeight <= e.clientHeight + 1);
      expect(fits, `#map-panel needs scrolling [${state}]`).toBe(true);
      for (const sel of ['#map-ghost', '#map-back', '#map-stages [data-stage-id="mata-atlantica"]']) {
        await expect(page.locator(sel)).toBeInViewport({ ratio: 1 });
      }
      // The label is readable: at least ~9px tall, like the rest of the compact UI.
      const labelHeight = await page.locator('#map-ghost-value').evaluate((e) => e.getBoundingClientRect().height);
      expect(labelHeight, `ghost label height [${state}]`).toBeGreaterThanOrEqual(9);
      if (state === 'off') await page.locator('#map-ghost').click();
    }
    expect(errors).toEqual([]);
  });
}
