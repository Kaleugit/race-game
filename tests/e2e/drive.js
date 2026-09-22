import { expect } from '@playwright/test';

// Shared e2e helpers for the EP-006 / EP-008-09 flow specs (CA-001/002/006/007). Test-only: no production hook,
// the game is driven through its real keyboard listeners and read through the DOM it already shows.

/** Collects pageerror / console.error messages; assert `expect(errors).toEqual([])` at the end. */
export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return errors;
}

const SHOW = /\bshow\b/;

/** Lobby GARAGEM -> garage carousel open. */
export async function openGarageFromLobby(page) {
  await page.locator('#lobby-garage').click();
  await expect(page.locator('#garage-overlay')).toHaveClass(SHOW);
}

/** Lobby CORRIDA (no ?stage=) -> stage map open. */
export async function openMapFromLobby(page) {
  await page.locator('#lobby-play').click();
  await expect(page.locator('#map-overlay')).toHaveClass(SHOW);
}

// Carousel slide (data-slide) of each garage field, and the option selector inside it.
const GARAGE_FIELDS = {
  color: { slide: 'color', option: (id) => `#garage-colors [data-color-id="${id}"]` },
  tire: { slide: 'tire', option: (id) => `#garage-tires [data-tire="${id}"]` },
  gearbox: { slide: 'gearbox', option: (id) => `#garage-gearboxes [data-gearbox="${id}"]` },
  engine: { slide: 'engine', option: (id) => `#garage-engines [data-engine="${id}"]` },
  chassis: { slide: 'chassis', option: (id) => `#garage-chassis [data-chassis="${id}"]` },
  tank: { slide: 'tank', option: (id) => `#garage-tanks [data-tank="${id}"]` },
};

/**
 * Brings a carousel slide on screen with the real ▶ arrow (one part at a time: options of hidden
 * slides are not clickable), at most one full lap.
 */
export async function goToGarageSlide(page, slide) {
  const card = page.locator('#garage-card');
  for (let i = 0; i < 6 && (await card.getAttribute('data-slide')) !== slide; i++) {
    await page.locator('#garage-next').click();
  }
  await expect(card).toHaveAttribute('data-slide', slide);
  await expect(page.locator(`.garage-slide[data-slide="${slide}"]`)).toBeVisible();
}

/**
 * Picks color / tire / gearbox / engine / chassis / tank in the open garage (any field may be
 * omitted), navigating the carousel to each part's slide first.
 */
export async function pickGarage(page, choice = {}) {
  for (const [key, id] of Object.entries(choice)) {
    if (!id) continue;
    const field = GARAGE_FIELDS[key];
    if (!field) throw new Error(`pickGarage: unknown field ${key}`);
    await goToGarageSlide(page, field.slide);
    await page.locator(field.option(id)).click();
    await expect(page.locator(field.option(id))).toHaveAttribute('aria-pressed', 'true');
  }
}

/** Garage PRONTO -> garage closes, back on the lobby home (CORRIDA / GARAGEM visible). */
export async function confirmGarage(page) {
  await page.locator('#garage-confirm').click();
  await expect(page.locator('#garage-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#map-overlay')).not.toHaveClass(SHOW);
  await expect(page.locator('#lobby-play')).toBeVisible();
  await expect(page.locator('#lobby-garage')).toBeVisible();
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
