/**
 * @module physics/params
 * @summary Car physics constants (BASE_PARAMS), moved verbatim from the pre-extraction
 * src/main.js; suspension limits and chassis hitbox moved from src/car.js (re-exported there).
 */

/** @summary Suspension rest length (also the spring mesh height in src/car.js). */
export const SUSP_REST = 0.110;
/** @summary Maximum suspension compression. */
export const SUSP_MAX_COMPRESS = 0.110;
/** @summary Maximum suspension extension. */
export const SUSP_MAX_EXTEND = 0.066;

/** @summary Chassis hitbox polygon in car-local [x, y] points (ground contact = crash). */
export const CHASSIS_HITBOX = Object.freeze([
  [-1.05,  0.40],
  [-1.05,  0.68],
  [ 0.55,  0.68],
  [ 0.55,  0.40],
  [ 0.45,  0.26],
  [ 1.45,  0.26],
  [ 1.45,  0.05],
].map((p) => Object.freeze(p)));

/**
 * @summary Default car parameters: the prototype's driving feel. Frozen; derive copies to tune.
 */
export const BASE_PARAMS = Object.freeze({
  maxSpeedNormal: 250 / 9,
  maxSpeedTurbo: 390 / 9,
  maxSpeedTurboOnly: 140 / 9,
  accelNormal: 14,
  accelTurbo: 30,
  accelTurboOnly: 18,
  brake: 26,
  reverseAccel: 8,
  maxReverse: 65 / 9,
  drag: 3.5,
  GRAVITY: 23.4,
  TURBO_DEPLETE: 1 / 3.0,
  TURBO_RECHARGE: 1 / 6.0,
  GROUND_LEAN: 0.198,
  AIR_TORQUE: 9.0,
  BOUNCE_MIN_AIRTIME: 1.0,
  BOUNCE_AIRTIME_CAP: 4.0,
  BOUNCE_DECAY: 0.4,
  BOUNCE_CHASSIS_SCALE: 0.13,
  SUSP_K: 77,
  SUSP_DAMP: 6.6,
  SUSP_REST,
  SUSP_MAX_COMPRESS,
  SUSP_MAX_EXTEND,
  CAR_HALF_HEIGHT: 1.00,
  CHASSIS_HITBOX,
});
