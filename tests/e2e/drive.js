import { expect } from '@playwright/test';

// Shared e2e helpers for the EP-006 flow specs (CA-001/002/006/007). Test-only: no production hook,
// the game is driven through its real keyboard listeners and read through the DOM it already shows.

/** Collects pageerror / console.error messages; assert `expect(errors).toEqual([])` at the end. */
export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return errors;
}

const SHOW = /\bshow\b/;

/** Lobby JOGAR (no ?stage=) -> garage open. */
export async function openGarageFromLobby(page) {
  await page.locator('#lobby-play').click();
  await expect(page.locator('#garage-overlay')).toHaveClass(SHOW);
}

/** Picks color / tire / gearbox in the open garage (any field may be omitted). */
export async function pickGarage(page, { color, tire, gearbox } = {}) {
  if (color) await page.locator(`#garage-colors [data-color-id="${color}"]`).click();
  if (tire) await page.locator(`#garage-tires [data-tire="${tire}"]`).click();
  if (gearbox) await page.locator(`#garage-gearboxes [data-gearbox="${gearbox}"]`).click();
}

/** Garage CONFIRMAR -> map open. */
export async function confirmGarage(page) {
  await page.locator('#garage-confirm').click();
  await expect(page.locator('#garage-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#map-overlay')).toHaveClass(SHOW);
}

/** Map stage click -> map closes -> countdown shows and ends (race running). */
export async function startStageFromMap(page, stageId) {
  await page.locator(`#map-stages [data-stage-id="${stageId}"]`).click();
  await expect(page.locator('#map-overlay')).not.toHaveClass(SHOW);
  await waitCountdown(page);
}

/** Countdown shows, then hides (inputs unlocked). */
export async function waitCountdown(page) {
  const countdown = page.locator('#countdown-overlay');
  await expect(countdown).toHaveClass(SHOW);
  await expect(countdown).not.toHaveClass(SHOW, { timeout: 15_000 });
}

/**
 * Drives the player car to the finish line and waits for the result screen.
 *
 * Policy = the reference driver of the calibration (tests/sim/reference-driver.js), the natural
 * human input: ArrowUp and Space both held for the whole race. Since EP-008-05 the turbo tank
 * recharges whenever the turbo is not burning (Space held or not) and re-ignites only after a
 * minimum refill (car-physics updateTurbo), so no tapping pattern beats holding. Air corrections are
 * not needed: in the headless sim holding both keys reproduces the reference time.
 *
 * The keys are dispatched as KeyboardEvents on `window` (the game's real listeners). A
 * requestAnimationFrame loop releases both keys when #end-overlay opens.
 */
export async function driveToFinish(page, { timeout = 150_000 } = {}) {
  await page.evaluate(() => {
    const fire = (type, key, code) => window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }));
    const end = document.getElementById('end-overlay');
    fire('keydown', 'ArrowUp', 'ArrowUp');
    fire('keydown', ' ', 'Space');
    const step = () => {
      if (end.classList.contains('show')) {
        fire('keyup', ' ', 'Space');
        fire('keyup', 'ArrowUp', 'ArrowUp');
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await expect(page.locator('#end-overlay')).toHaveClass(SHOW, { timeout });
}

/** Raw seconds the result screen stores in data-seconds (player, bot). */
export async function resultSeconds(page) {
  const player = Number(await page.locator('#end-player-time').getAttribute('data-seconds'));
  const bot = Number(await page.locator('#end-bot-time').getAttribute('data-seconds'));
  return { player, bot };
}
