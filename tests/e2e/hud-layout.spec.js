import { test, expect } from '@playwright/test';
import { trackErrors, waitCountdown } from './drive.js';

// EP-008-07: during a race the HUD (speed + turbo gauges, DIST / BOT readouts, bot-won notice), the race
// bar (with the stage name), the in-race buttons and the touch controls never overlap each other and
// stay inside the viewport, on desktop and phone landscape, with the touch controls switched on.
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 640, height: 360 },
  { width: 740, height: 360 },
];

test.use({ hasTouch: true });

function intersects(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

for (const viewport of VIEWPORTS) {
  test(`HUD, barra e controles touch sem sobreposição em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.setViewportSize(viewport);
    await page.goto('/?stage=mata-atlantica');
    await page.locator('#lobby-play').click();
    await waitCountdown(page);
    await page.locator('#mobiletoggle').click();
    await expect(page.locator('#touchpad')).toHaveClass(/\bshow\b/);
    await expect(page.locator('#help')).toBeHidden();
    await page.keyboard.down('ArrowUp');
    await expect.poll(async () => Number(await page.locator('#speed').textContent()), { timeout: 10_000 }).toBeGreaterThan(0);
    // Worst case: the bot-won notice is also on screen (test-only reveal of an existing element).
    await page.evaluate(() => { document.getElementById('hud-bot-won').style.display = ''; });

    const boxes = await page.evaluate(() => {
      const rect = (el) => el.getBoundingClientRect().toJSON();
      const union = (rs) => ({
        left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)),
        right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)),
      });
      const hudParts = ['#speed-gauge', '#turbo-gauge', '.hud-readouts', '#hud-bot-won'].map((s) => document.querySelector(s));
      const groups = {
        hud: union(hudParts.map(rect)),
        raceBar: union(['#race-bar', '#race-bar-stage', '#race-bar-player', '#race-bar-bot'].map((s) => rect(document.querySelector(s)))),
        actions: union([...document.querySelectorAll('#race-actions .race-btn')].filter((b) => b.offsetParent).map(rect)),
      };
      document.querySelectorAll('#touchpad .tbtn').forEach((b, i) => { groups[`touch${i}`] = rect(b); });
      const speedText = rect(document.getElementById('speed'));
      return { groups, speedTextHeight: speedText.height, turboWidth: rect(document.getElementById('turbo-gauge')).width };
    });

    const names = Object.keys(boxes.groups);
    expect(names.filter((n) => n.startsWith('touch'))).toHaveLength(4);
    for (const n of names) {
      const b = boxes.groups[n];
      expect(b.right - b.left, `${n} has size`).toBeGreaterThan(0);
      expect(b.left, `${n} left`).toBeGreaterThanOrEqual(0);
      expect(b.top, `${n} top`).toBeGreaterThanOrEqual(0);
      expect(b.right, `${n} right`).toBeLessThanOrEqual(viewport.width);
      expect(b.bottom, `${n} bottom`).toBeLessThanOrEqual(viewport.height);
    }
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (names[i].startsWith('touch') && names[j].startsWith('touch')) continue; // pads lay out their own buttons
        expect(intersects(boxes.groups[names[i]], boxes.groups[names[j]]), `${names[i]} x ${names[j]}`).toBe(false);
      }
    }
    // Readable: the digital speed is at least ~9px tall and the turbo gauge at least 50px wide.
    expect(boxes.speedTextHeight).toBeGreaterThanOrEqual(9);
    expect(boxes.turboWidth).toBeGreaterThanOrEqual(50);
    await page.keyboard.up('ArrowUp');
    expect(errors).toEqual([]);
  });
}
