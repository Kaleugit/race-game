/**
 * @module parts/presets
 * @summary Tire and gearbox presets (RF-008, RF-009) and resolveCarParams, which turns a part
 * selection into car physics params. Misto + Padrão are the identity over BASE_PARAMS.
 */

/**
 * Tires: `topSpeedMult` scales every top speed; `grip` is the acceleration multiplier by surface
 * (absolute, replaces params.grip). Misto must equal BASE_PARAMS.grip (the original driving feel).
 * No tire wins on every surface (CDC-102): Estrada is fastest on dirt, Off-road in mud/sand.
 * @summary Tire presets keyed by id (`estrada`, `misto`, `offroad`).
 */
export const TIRES = Object.freeze({
  estrada: Object.freeze({
    label: 'Estrada',
    topSpeedMult: 1.05,
    grip: Object.freeze({ dirt: 1.0, mud: 0.6, sand: 0.55 }),
  }),
  misto: Object.freeze({
    label: 'Misto',
    topSpeedMult: 1,
    grip: Object.freeze({ dirt: 1, mud: 0.8, sand: 0.75 }),
  }),
  offroad: Object.freeze({
    label: 'Off-road',
    topSpeedMult: 0.94,
    grip: Object.freeze({ dirt: 0.95, mud: 0.95, sand: 1.0 }),
  }),
});

/**
 * Automatic gearboxes as an acceleration x top-speed trade-off (no discrete gears, DA-006 of EP-003).
 * @summary Gearbox presets keyed by id (`curta`, `padrao`, `longa`).
 */
export const GEARBOXES = Object.freeze({
  curta: Object.freeze({ label: 'Curta', accelMult: 1.15, topSpeedMult: 0.93 }),
  padrao: Object.freeze({ label: 'Padrão', accelMult: 1, topSpeedMult: 1 }),
  longa: Object.freeze({ label: 'Longa', accelMult: 0.88, topSpeedMult: 1.06 }),
});

/** @summary Default part selection (identity over BASE_PARAMS). */
export const DEFAULT_PARTS = Object.freeze({ tire: 'misto', gearbox: 'padrao' });

const ACCEL_KEYS = ['accelNormal', 'accelTurbo', 'accelTurboOnly'];
const TOP_SPEED_KEYS = ['maxSpeedNormal', 'maxSpeedTurbo', 'maxSpeedTurboOnly'];

/**
 * Resolves a part selection into physics params. `upgrades` is a list of
 * `{ accelMult?, topSpeedMult? }` multipliers (room for engine/turbo/chassis upgrades, EP-006).
 * Throws on an unknown tire or gearbox id.
 * @summary Build frozen car params from `base` and `{ tire, gearbox, upgrades = [] }`.
 * @param {object} base physics params (usually BASE_PARAMS)
 * @param {{ tire: string, gearbox: string, upgrades?: Array<{ accelMult?: number, topSpeedMult?: number }> }} parts
 */
export function resolveCarParams(base, { tire, gearbox, upgrades = [] }) {
  const t = TIRES[tire];
  const g = GEARBOXES[gearbox];
  if (!t) throw new Error(`unknown tire '${tire}'`);
  if (!g) throw new Error(`unknown gearbox '${gearbox}'`);
  let accelMult = g.accelMult;
  let topSpeedMult = t.topSpeedMult * g.topSpeedMult;
  for (const u of upgrades) {
    accelMult *= u.accelMult ?? 1;
    topSpeedMult *= u.topSpeedMult ?? 1;
  }
  const params = { ...base, grip: Object.freeze({ ...t.grip }) };
  for (const k of ACCEL_KEYS) params[k] = base[k] * accelMult;
  for (const k of TOP_SPEED_KEYS) params[k] = base[k] * topSpeedMult;
  return Object.freeze(params);
}
