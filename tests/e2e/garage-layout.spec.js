import { test, expect } from '@playwright/test';
import { openGarageFromLobby, goToGarageSlide } from './drive.js';
import { GARAGE_SLIDES } from '../../src/ui/garage.js';

// EP-008-06 / EP-008-09: the garage carousel card (#garage-card) never covers the lobby car nor the
// TELA CHEIA button, on desktop and mobile landscape, on EVERY slide of the carousel, and every
// control (arrows, the slide's options, PRONTO) is reachable without scrolling. The car's on-screen box is measured from its real pixels: the page is re-rendered with
// only the transparent WebGL canvas visible and the opaque pixels are bounded.
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 640, height: 360 },
  { width: 740, height: 360 },
];
const DOCKS = ['#garage-card'];

const rectOf = (locator) => locator.evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
});

const intersects = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** Bounding box of the car's opaque pixels on the lobby canvas (viewport CSS px). */
async function carScreenBox(page) {
  await page.addStyleTag({
    content: 'html, body, #lobby { background: transparent !important; }'
      + ' body * { visibility: hidden !important; } #lobby-canvas { visibility: visible !important; }',
  });
  // Two frames so the hidden overlays are gone from the composited screenshot.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const png = (await page.screenshot({ omitBackground: true })).toString('base64');
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let left = Infinity; let top = Infinity; let right = -1; let bottom = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > 40) {
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
    // Screenshot px -> CSS px (deviceScaleFactor 1 in this project, kept generic).
    const k = window.innerWidth / c.width;
    return { left: left * k, top: top * k, right: (right + 1) * k, bottom: (bottom + 1) * k };
  }, png);
}

for (const viewport of VIEWPORTS) {
  test(`garagem não cobre o carro nem TELA CHEIA em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await openGarageFromLobby(page);

    const fullscreen = await rectOf(page.locator('#lobby-fullscreen-wrap'));
    const docks = [];
    for (const slide of GARAGE_SLIDES) {
      await goToGarageSlide(page, slide);
      for (const sel of DOCKS) {
        const dock = page.locator(sel);
        await expect(dock).toBeVisible();
        const rect = await rectOf(dock);
        // Inside the viewport, and no scroll needed to reach any control (PRONTO included).
        expect(rect.left).toBeGreaterThanOrEqual(0);
        expect(rect.top).toBeGreaterThanOrEqual(0);
        expect(rect.right).toBeLessThanOrEqual(viewport.width);
        expect(rect.bottom).toBeLessThanOrEqual(viewport.height);
        const fits = await dock.evaluate((e) => e.scrollHeight <= e.clientHeight + 1 && e.scrollWidth <= e.clientWidth + 1);
        expect(fits, `${sel} needs scrolling`).toBe(true);
        expect(intersects(rect, fullscreen), `${sel} covers TELA CHEIA`).toBe(false);
        docks.push({ sel: `${sel} [${slide}]`, rect });
      }
      const confirm = await rectOf(page.locator('#garage-confirm'));
      expect(confirm.bottom).toBeLessThanOrEqual(viewport.height);
      await expect(page.locator('#garage-confirm')).toBeInViewport({ ratio: 1 });
      for (const ctl of ['#garage-prev', '#garage-next']) await expect(page.locator(ctl)).toBeInViewport({ ratio: 1 });
      const opts = page.locator(`.garage-slide[data-slide="${slide}"] button`);
      for (let i = 0; i < await opts.count(); i++) await expect(opts.nth(i)).toBeInViewport({ ratio: 1 });
    }

    const car = await carScreenBox(page);
    // The car really rendered (side view is ~0.58 x viewport height long).
    expect(car.right - car.left).toBeGreaterThan(viewport.height * 0.45);
    for (const { sel, rect } of docks) expect(intersects(rect, car), `${sel} covers the car`).toBe(false);
  });
}
