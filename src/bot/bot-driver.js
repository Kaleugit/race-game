/**
 * @module bot/bot-driver
 * @summary Bot AI (RF-004): turns the bot car's state into the same input the player produces
 * (`{ up, down, left, right, space, locked }`) for a normal createCarPhysics instance — no special
 * physics, no rubber-banding. Errors come from a seeded PRNG (CDC-106), so a seed replays a race.
 */
import { createPrng } from './prng.js';
import { BASE_PARAMS } from '../physics/params.js';

// Tuning knobs. "easy"/"hard" values are interpolated by difficulty (0 = easy, 1 = hard).
const TUNING = Object.freeze({
  // Error episodes started per second of driving (throttle lift, turbo hesitation, turbo dump).
  // EP-008-05 raised the rates and lift lengths: with the turbo budget-limited for everyone, a turbo
  // hesitation only saves fuel for later, so throttle lifts are what make the bot beatable.
  errorRate: { easy: 1.2, hard: 0.4 },
  // Throttle lift duration range (s). The turbo button keeps following the turbo policy, so a lift
  // with fuel is turbo without throttle (a much lower top speed) — a real, costly input mistake.
  liftDuration: [0.4, 0.9],
  // Turbo hesitation duration range (s): the bot does not use turbo although it could.
  turboHoldDuration: [0.8, 2.2],
  // Delay (s) between leaving the ground and the first air correction (scaled by 0.6..1.4).
  reactionDelay: { easy: 0.4, hard: 0.1 },
  // Air attitude tolerance (rad) before the bot corrects.
  airTolerance: { easy: 0.3, hard: 0.08 },
  // Turbo policy: burn while there is fuel, except when the slope here and lookAhead m ahead are a
  // descent steeper than descentSlope (the tank recharges there for the next climb).
  descentSlope: -0.3,
  lookAhead: 12,
  // Stall recovery: on a climb (slope > climbSlope), below stallSpeed for stallTime -> turbo if fuel
  // allows, else back up (no turbo, so the tank recharges) until the tank is backupFuel full on flat
  // ground (slope < flatSlope), or for at most backupMaxTime.
  climbSlope: 0.25,
  stallSpeed: 1.0,
  stallTime: 0.5,
  boostFuel: 0.35,
  flatSlope: 0.15,
  backupMaxTime: 4,
  backupFuel: 0.9,
});

const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Creates the bot controller for one race. `difficulty` (0..1, from `stage.bot.difficulty`) lowers
 * the error frequency, the reaction delay and the air tolerance. `params` only provides GRAVITY for
 * the landing prediction (defaults to BASE_PARAMS).
 * @summary Bot controller: `createBotDriver({ track, difficulty, seed })` -> `{ decide(carState, dt) }`.
 * @param {{ track: { heightAt: Function, slopeAt: Function, finishX: number }, difficulty?: number, seed?: number, params?: object }} options
 */
export function createBotDriver({ track, difficulty = 0.5, seed = 1, params = BASE_PARAMS }) {
  const rng = createPrng(seed);
  const d = Math.min(1, Math.max(0, difficulty));
  const skill = (k) => lerp(TUNING[k].easy, TUNING[k].hard, d);
  const between = ([lo, hi]) => lerp(lo, hi, rng());

  const errorRate = skill('errorRate');
  const airTolerance = skill('airTolerance');

  let liftLeft = 0; // throttle released (error)
  let turboHoldLeft = 0; // turbo not used (error)
  let turboDump = false; // burns the whole tank regardless of terrain (error)
  let wasAirborne = false;
  let reactLeft = 0;
  let stallFor = 0;
  let mode = 'drive'; // 'drive' | 'boost' | 'backup'
  let backupFor = 0;

  function maybeStartError(dt) {
    if (liftLeft > 0 || turboHoldLeft > 0 || turboDump) return;
    if (rng() >= errorRate * dt) return;
    const kind = rng();
    if (kind < 0.5) liftLeft = between(TUNING.liftDuration);
    else if (kind < 0.8) turboHoldLeft = between(TUNING.turboHoldDuration);
    else turboDump = true;
  }

  function groundAt(x) {
    return (track.heightAt(x + 1) + track.heightAt(x - 1)) / 2;
  }

  // Ballistic flight until the wheel line meets the ground; x of the predicted touchdown.
  function landingX(s) {
    const h = 1 / 30;
    let x = s.x;
    let y = s.y;
    let vy = s.vy;
    for (let i = 0; i < 150; i++) {
      x += s.speed * h;
      vy -= params.GRAVITY * h;
      y += vy * h;
      if (y <= groundAt(x)) break;
    }
    return x;
  }

  // Air control: match rot to the slope at the predicted landing point.
  function airInput(s) {
    const target = Math.atan(track.slopeAt(landingX(s)));
    const err = wrap(s.rot - target);
    if (Math.abs(err) < airTolerance && Math.abs(s.angVel) < 0.5) return {};
    const wanted = Math.max(-3, Math.min(3, -2.5 * err));
    if (s.angVel < wanted - 0.3) return { left: true };
    if (s.angVel > wanted + 0.3) return { right: true };
    return {};
  }

  function wantsTurbo(s) {
    if (s.fuel <= 0 || turboHoldLeft > 0) return false;
    if (turboDump) return true;
    const ahead = Math.max(track.slopeAt(s.x), track.slopeAt(s.x + TUNING.lookAhead));
    return ahead > TUNING.descentSlope;
  }

  // Stall on a climb (e.g. right after auto-righting): run up with turbo, or back up to recharge.
  function recovery(s, dt) {
    const onClimb = track.slopeAt(s.x) > TUNING.climbSlope;
    if (mode === 'drive') {
      stallFor = onClimb && s.speed < TUNING.stallSpeed ? stallFor + dt : 0;
      if (stallFor >= TUNING.stallTime) {
        stallFor = 0;
        mode = s.fuel >= TUNING.boostFuel ? 'boost' : 'backup';
        backupFor = 0;
      }
    }
    if (mode === 'boost') {
      if (s.fuel <= 0) mode = 'backup';
      else if (!onClimb || s.speed > 3 * TUNING.stallSpeed) mode = 'drive';
      else return { up: true, space: true };
    }
    if (mode === 'backup') {
      backupFor += dt;
      const ready = s.fuel >= TUNING.backupFuel && track.slopeAt(s.x) < TUNING.flatSlope;
      if (!ready && backupFor < TUNING.backupMaxTime) return { down: true };
      mode = 'drive';
    }
    return null;
  }

  /**
   * @summary Next input for the bot car: `{ up, down, left, right, space, locked: false }`.
   * @param {object} s bot car state (createCarPhysics().state)
   * @param {number} dt frame time (s)
   */
  function decide(s, dt) {
    const input = { up: false, down: false, left: false, right: false, space: false, locked: false };
    if (s.overturned) {
      // Inputs are ignored upside down; wait for the auto-right (RF-005).
      mode = 'drive';
      stallFor = 0;
      return input;
    }
    if (s.airborne && !wasAirborne) reactLeft = skill('reactionDelay') * (0.6 + 0.8 * rng());
    wasAirborne = s.airborne;

    maybeStartError(dt);
    liftLeft = Math.max(0, liftLeft - dt);
    turboHoldLeft = Math.max(0, turboHoldLeft - dt);
    if (turboDump && s.fuel <= 0) turboDump = false;

    if (s.airborne) {
      reactLeft -= dt;
      if (reactLeft <= 0) Object.assign(input, airInput(s));
      input.up = liftLeft <= 0;
      input.space = wantsTurbo(s);
      return input;
    }

    const rec = recovery(s, dt);
    if (rec) return Object.assign(input, rec);
    input.up = liftLeft <= 0;
    input.space = wantsTurbo(s);
    return input;
  }

  return { decide };
}

/**
 * Advances only the bot until it crosses `track.finishX` (used when the player finishes first,
 * epic DA-002). The race clock starts at `startTime` and stops at `maxTime`.
 * @summary Simulate the bot to the finish line; returns its finish time (s) or null past `maxTime`.
 * @param {{ car: { state: object, step: Function }, driver: { decide: Function }, track: { finishX: number }, dt?: number, maxTime?: number, startTime?: number }} options
 * @returns {number | null}
 */
export function runBotToFinish({ car, driver, track, dt = 1 / 60, maxTime = 180, startTime = 0 }) {
  let t = startTime;
  while (car.state.x < track.finishX) {
    if (t >= maxTime) return null;
    car.step(dt, driver.decide(car.state, dt));
    t += dt;
  }
  return t;
}
