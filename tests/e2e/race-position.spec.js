import { test, expect } from '@playwright/test';
import { trackErrors } from './drive.js';

// EP-008-10: the pre-race countdown lasts ~1 s ("1" -> "VAI!" -> control), the HUD shows only the
// player's distance (no BOT readout) and the race bar shows 1º / 2º for each racer, consistent with
// who is further along the track, flipping when the bot passes and when the player takes the lead back.

const SHOW = /\bshow\b/;

test('contagem de ~1 s e posições 1º/2º coerentes com as distâncias', async ({ page }) => {
  const errors = trackErrors(page);
  // ?dev enables the existing debug key T (infinite turbo) so the player can reliably retake the lead.
  await page.goto('/?stage=mata-atlantica&dev');

  // Wall-clock countdown timing + the texts it showed, recorded by a MutationObserver (test-only).
  await page.evaluate(() => {
    const overlay = document.getElementById('countdown-overlay');
    const num = document.getElementById('countdown-num');
    const rec = { texts: [], shownAt: null, hiddenAt: null };
    window.__countdown = rec;
    const note = () => { const t = num.textContent; if (rec.texts[rec.texts.length - 1] !== t) rec.texts.push(t); };
    new MutationObserver(note).observe(num, { childList: true, characterData: true, subtree: true });
    new MutationObserver(() => {
      const on = overlay.classList.contains('show');
      if (on && rec.shownAt == null) { rec.shownAt = performance.now(); note(); }
      if (!on && rec.shownAt != null && rec.hiddenAt == null) rec.hiddenAt = performance.now();
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  });
  await page.locator('#lobby-play').click();
  await expect(page.locator('#countdown-overlay')).toHaveClass(SHOW);
  await expect(page.locator('#countdown-overlay')).not.toHaveClass(SHOW, { timeout: 10_000 });
  const cd = await page.evaluate(() => window.__countdown);
  expect(cd.texts).toEqual(['1', 'VAI!']);
  const seconds = (cd.hiddenAt - cd.shownAt) / 1000;
  expect(seconds, 'countdown duration (s)').toBeGreaterThanOrEqual(0.9);
  expect(seconds, 'countdown duration (s)').toBeLessThan(1.8);

  // Only the player's distance is shown; the bot distance readout is gone.
  await expect(page.locator('#dist')).toBeVisible();
  await expect(page.locator('#bot-dist')).toHaveCount(0);
  await expect(page.locator('#race-bar')).toHaveClass(SHOW);

  // Every frame: the badges must agree with the race-bar markers whenever the gap is clear (> 1% of track).
  await page.evaluate(() => {
    const you = document.getElementById('race-pos-you');
    const bot = document.getElementById('race-pos-bot');
    const pm = document.getElementById('race-bar-player');
    const bm = document.getElementById('race-bar-bot');
    const log = { frames: 0, bad: [], orders: [] };
    window.__positions = log;
    const step = () => {
      const p = parseFloat(pm.style.left) || 0;
      const b = parseFloat(bm.style.left) || 0;
      const y = you.textContent;
      const o = bot.textContent;
      log.frames++;
      if (!((y === '1º' && o === '2º') || (y === '2º' && o === '1º'))) log.bad.push(`badges ${y}/${o}`);
      if (you.dataset.leader !== String(y === '1º') || bot.dataset.leader !== String(o === '1º')) log.bad.push('leader flag');
      if (p - b > 1 && y !== '1º') log.bad.push(`player ahead ${p}>${b} but ${y}`);
      if (b - p > 1 && o !== '1º') log.bad.push(`bot ahead ${b}>${p} but ${o}`);
      if (log.orders[log.orders.length - 1] !== y) log.orders.push(y);
      if (!document.getElementById('end-overlay').classList.contains('show')) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  // Player waits at the line: the bot pulls ahead -> BOT 1º, VOCÊ 2º.
  await expect(page.locator('#race-pos-bot')).toHaveText('1º', { timeout: 10_000 });
  await expect(page.locator('#race-pos-you')).toHaveText('2º');
  await expect(page.locator('#race-pos-bot')).toHaveAttribute('data-leader', 'true');
  await expect(page.locator('#dist')).toHaveText('0');

  // Player floors it with infinite turbo: takes the lead back -> VOCÊ 1º, BOT 2º.
  await page.evaluate(() => {
    const fire = (type, key, code) => window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }));
    fire('keydown', 't', 'KeyT');
    fire('keyup', 't', 'KeyT');
    fire('keydown', 'ArrowUp', 'ArrowUp');
    fire('keydown', ' ', 'Space');
  });
  await expect(page.locator('#race-pos-you')).toHaveText('1º', { timeout: 45_000 });
  await expect(page.locator('#race-pos-bot')).toHaveText('2º');
  await expect(page.locator('#race-pos-you')).toHaveAttribute('data-leader', 'true');
  await expect.poll(async () => Number(await page.locator('#dist').textContent())).toBeGreaterThan(0);

  const log = await page.evaluate(() => {
    const fire = (type, key, code) => window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }));
    fire('keyup', ' ', 'Space');
    fire('keyup', 'ArrowUp', 'ArrowUp');
    return window.__positions;
  });
  expect(log.frames).toBeGreaterThan(30);
  expect(log.bad).toEqual([]);
  // Bot passes (VOCÊ 2º) -> player back in front (VOCÊ 1º).
  expect(log.orders.slice(-2)).toEqual(['2º', '1º']);
  expect(errors).toEqual([]);
});
