/**
 * @module parts/presets
 * @summary Tire, gearbox, engine, chassis and turbo tank presets (RF-008, RF-009, RF-012) and
 * resolveCarParams, which turns a part selection into car physics params. The default parts
 * (Misto + Padrão + 2.0 + Médio + Médio) are the identity over BASE_PARAMS.
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

/**
 * Engines (RF-012): more HP = more acceleration and top speed, but a heavier engine (mass) that
 * also burns the turbo faster (`turboBurnMult` on TURBO_DEPLETE = less turbo time per tank).
 * `sound` overrides createEngineModel options (src/audio/engine-model.js) and `timbre` scales the
 * synth brightness (src/sound.js): the 1.6 revs lower and sounds deeper, the 2.4 revs higher and
 * sounds brighter (sounds swapped by the manager, EP-008-08). 2.0 is the original engine (all multipliers 1, no sound override).
 * @summary Engine presets keyed by id (`e16`, `e20`, `e24`).
 */
export const ENGINES = Object.freeze({
  e16: Object.freeze({
    label: '1.6',
    accelMult: 0.95,
    topSpeedMult: 0.95,
    mass: 0.9,
    turboBurnMult: 0.85,
    sound: Object.freeze({ idleRpm: 750, redlineRpm: 3700, upshiftRpm: 3300, downshiftRpm: 1400, launchRpm: 1700 }),
    timbre: 0.88,
  }),
  e20: Object.freeze({
    label: '2.0',
    accelMult: 1,
    topSpeedMult: 1,
    mass: 1,
    turboBurnMult: 1,
    sound: Object.freeze({}),
    timbre: 1,
  }),
  e24: Object.freeze({
    label: '2.4',
    accelMult: 1.08,
    topSpeedMult: 1.06,
    mass: 1.1,
    turboBurnMult: 1.18,
    sound: Object.freeze({ idleRpm: 850, redlineRpm: 4400, upshiftRpm: 3950, downshiftRpm: 1650, launchRpm: 1950 }),
    timbre: 1.12,
  }),
});

/**
 * Chassis (RF-012): only the weight changes. Lighter = more acceleration but more air torque and a
 * bigger landing rebound (less stable); heavier = less acceleration, calmer in the air and on
 * landings (see BASE_PARAMS.mass). Médio is the original chassis.
 * @summary Chassis presets keyed by id (`leve`, `medio`, `pesado`).
 */
export const CHASSIS = Object.freeze({
  leve: Object.freeze({ label: 'Leve', mass: 0.88 }),
  medio: Object.freeze({ label: 'Médio', mass: 1 }),
  pesado: Object.freeze({ label: 'Pesado', mass: 1.14 }),
});

/**
 * Turbo fuel tanks (RF-012): `capacity` scales the turbo time per full tank (and the refill time,
 * BASE_PARAMS.turboCapacity); a bigger tank is heavier. Médio is the original tank.
 * @summary Turbo tank presets keyed by id (`pequeno`, `medio`, `grande`).
 */
export const TANKS = Object.freeze({
  pequeno: Object.freeze({ label: 'Pequeno', capacity: 0.7, mass: 0.96 }),
  medio: Object.freeze({ label: 'Médio', capacity: 1, mass: 1 }),
  grande: Object.freeze({ label: 'Grande', capacity: 1.4, mass: 1.05 }),
});

/** @summary Default part selection (the original car: identity over BASE_PARAMS). */
export const DEFAULT_PARTS = Object.freeze({ tire: 'misto', gearbox: 'padrao', engine: 'e20', chassis: 'medio', tank: 'medio' });

const ACCEL_KEYS = ['accelNormal', 'accelTurbo', 'accelTurboOnly'];
const TOP_SPEED_KEYS = ['maxSpeedNormal', 'maxSpeedTurbo', 'maxSpeedTurboOnly'];

/**
 * Resolves a part selection into physics params. `engine`, `chassis` and `tank` default to
 * DEFAULT_PARTS (so a `{ tire, gearbox }` selection keeps working). `upgrades` is a list of
 * `{ accelMult?, topSpeedMult? }` multipliers. Throws on an unknown part id.
 * @summary Build frozen car params from `base` and `{ tire, gearbox, engine?, chassis?, tank?, upgrades = [] }`.
 * @param {object} base physics params (usually BASE_PARAMS)
 * @param {{ tire: string, gearbox: string, engine?: string, chassis?: string, tank?: string, upgrades?: Array<{ accelMult?: number, topSpeedMult?: number }> }} parts
 */
export function resolveCarParams(base, {
  tire, gearbox, engine = DEFAULT_PARTS.engine, chassis = DEFAULT_PARTS.chassis, tank = DEFAULT_PARTS.tank, upgrades = [],
}) {
  const t = TIRES[tire];
  const g = GEARBOXES[gearbox];
  const e = ENGINES[engine];
  const c = CHASSIS[chassis];
  const k = TANKS[tank];
  if (!t) throw new Error(`unknown tire '${tire}'`);
  if (!g) throw new Error(`unknown gearbox '${gearbox}'`);
  if (!e) throw new Error(`unknown engine '${engine}'`);
  if (!c) throw new Error(`unknown chassis '${chassis}'`);
  if (!k) throw new Error(`unknown tank '${tank}'`);
  let accelMult = g.accelMult * e.accelMult;
  let topSpeedMult = t.topSpeedMult * g.topSpeedMult * e.topSpeedMult;
  for (const u of upgrades) {
    accelMult *= u.accelMult ?? 1;
    topSpeedMult *= u.topSpeedMult ?? 1;
  }
  const params = { ...base, grip: Object.freeze({ ...t.grip }) };
  for (const key of ACCEL_KEYS) params[key] = base[key] * accelMult;
  for (const key of TOP_SPEED_KEYS) params[key] = base[key] * topSpeedMult;
  // All 1 for the default parts, so the products below are exact (identity over base).
  params.mass = base.mass * e.mass * c.mass * k.mass;
  params.turboCapacity = base.turboCapacity * k.capacity;
  params.TURBO_DEPLETE = base.TURBO_DEPLETE * e.turboBurnMult;
  return Object.freeze(params);
}
