/**
 * @module audio/engine-model
 * @summary Pure engine model for the engine sound (EP-007): RPM from car speed through a 5-speed
 * automatic gearbox scaled by the EP-003 gearbox preset, ratio-based RPM drop on upshift,
 * idle/redline limits, airborne free-rev and the 4-stroke firing frequency. No Web Audio / DOM.
 */
import { GEARBOXES } from '../parts/presets.js';

/**
 * Defaults: 4-cylinder 4-stroke diesel (Toyota Bandeirante), idle 800 / redline 4000 rpm, so the
 * firing frequency spans ~27-133 Hz. EP-008-02 "longer gears": `finalDrive` 3.3 (was 4.5) makes
 * every gear span 4.5 / 3.3 ~= 1.36x more speed (first upshift ~17-20 m/s instead of ~13-15), so a
 * race has fewer upshifts; top gear sits at ~2620 rpm at BASE_PARAMS.maxSpeedTurbo (inside
 * [idle, redline] for every gearbox preset, because the preset scales the ratios by
 * 1 / topSpeedMult) and full turbo now tops out in 4th. Sound only: physics is unaffected.
 * `wheelRadius` mirrors WHEEL_RADIUS in src/car.js (not imported: that module needs three.js).
 * @summary Default engine/gearbox configuration.
 */
export const ENGINE_DEFAULTS = Object.freeze({
  gearRatios: Object.freeze([3.2, 2.1, 1.5, 1.18, 0.96]),
  finalDrive: 3.3,
  wheelRadius: 0.5,
  idleRpm: 800,
  redlineRpm: 4000,
  upshiftRpm: 3600,
  downshiftRpm: 1500,
  // Clutch-slip RPM at full throttle while the wheels are too slow to hold the engine above idle.
  launchRpm: 1800,
  cylinders: 4,
  // Seconds of the shift interval (clutch open, load 0, no further shift).
  shiftTime: 0.2,
  // First-order response rates (1/s): on the ground, and free-revving in the air up/down.
  rpmResponse: 20,
  airRevUp: 8,
  airRevDown: 3,
  gearboxPreset: 'padrao',
});

/**
 * Gear ratios for a gearbox preset: `gearRatios / GEARBOXES[preset].topSpeedMult`, so Curta
 * (lower top speed) has shorter ratios and shifts earlier in speed than Longa.
 * Throws on an unknown preset id.
 * @summary Scale gear ratios by the EP-003 gearbox preset (`curta`, `padrao`, `longa`).
 * @param {number[]} gearRatios base ratios, first gear first
 * @param {string} preset gearbox id from GEARBOXES
 * @returns {number[]}
 */
export function scaleGearRatios(gearRatios, preset) {
  const g = GEARBOXES[preset];
  if (!g) throw new Error(`unknown gearbox '${preset}'`);
  return gearRatios.map((r) => r / g.topSpeedMult);
}

/**
 * Creates an engine model. `update(dt, { speed, throttle, airborne })` advances it one step:
 * `speed` is the car speed (physics units, sign ignored), `throttle` 0..1 (booleans accepted),
 * `airborne` frees the wheels (fast free-rev with throttle, no shifts; RPM rejoins the wheels on
 * landing). Returns `{ rpm, gear, load, shifting, firingHz }` with rpm in [idleRpm, redlineRpm],
 * gear 1-based, load 0..1 (0 while shifting), firingHz = rpm / 60 * cylinders / 2.
 * @summary Build a pure engine model: `{ update(dt, input), reset(), gearRatios }`.
 * @param {Partial<typeof ENGINE_DEFAULTS>} [options]
 */
export function createEngineModel(options = {}) {
  const cfg = { ...ENGINE_DEFAULTS, ...options };
  const ratios = Object.freeze(scaleGearRatios(cfg.gearRatios, cfg.gearboxPreset));
  const top = ratios.length;
  const wheelRpmPerSpeed = 60 / (2 * Math.PI * cfg.wheelRadius);
  let rpm;
  let gear;
  let shiftTimer;

  function reset() {
    rpm = cfg.idleRpm;
    gear = 1;
    shiftTimer = 0;
  }

  const clamp = (v) => Math.min(cfg.redlineRpm, Math.max(cfg.idleRpm, v));
  const approach = (from, to, rate, dt) => from + (to - from) * Math.min(1, rate * dt);
  const coupledRpm = (wheelRpm, g) => wheelRpm * ratios[g - 1] * cfg.finalDrive;

  function update(dt, { speed = 0, throttle = 0, airborne = false } = {}) {
    const thr = Math.min(1, Math.max(0, Number(throttle) || 0));
    const wheelRpm = Math.abs(speed) * wheelRpmPerSpeed;
    shiftTimer = Math.max(0, shiftTimer - dt);
    let shifted = false;

    if (!airborne && shiftTimer === 0) {
      const coupled = coupledRpm(wheelRpm, gear);
      // Upshift only once the engine itself has reached the shift point (not while it is still
      // catching up with the wheels after a landing), so the drop is always the ratio step.
      if (gear < top && coupled >= cfg.upshiftRpm && rpm >= cfg.upshiftRpm) {
        rpm *= ratios[gear] / ratios[gear - 1];
        gear += 1;
        shifted = true;
      } else if (gear > 1 && coupled < cfg.downshiftRpm) {
        rpm *= ratios[gear - 2] / ratios[gear - 1];
        gear -= 1;
        shifted = true;
      }
      if (shifted) shiftTimer = cfg.shiftTime;
    }

    if (!shifted) {
      if (airborne) {
        const target = thr > 0 ? cfg.idleRpm + thr * (cfg.redlineRpm - cfg.idleRpm) : cfg.idleRpm;
        rpm = approach(rpm, target, target > rpm ? cfg.airRevUp : cfg.airRevDown, dt);
      } else {
        const slip = cfg.idleRpm + thr * (cfg.launchRpm - cfg.idleRpm);
        rpm = approach(rpm, Math.max(coupledRpm(wheelRpm, gear), slip), cfg.rpmResponse, dt);
      }
    }
    rpm = clamp(rpm);

    const shifting = shiftTimer > 0;
    const load = shifting ? 0 : airborne ? thr * 0.3 : thr;
    return { rpm, gear, load, shifting, firingHz: (rpm / 60) * (cfg.cylinders / 2) };
  }

  reset();
  return { update, reset, gearRatios: ratios };
}
