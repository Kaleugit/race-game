/**
 * @module profile/profile
 * @summary Local player profile (RF-003, RF-007): garage choice and stage progress persisted under
 * the `race_profile_v1` key of an injected Storage. No DOM besides the storage; never throws.
 */
import { TIRES, GEARBOXES, ENGINES, CHASSIS, TANKS, DEFAULT_PARTS } from '../parts/presets.js';
import { DEFAULT_COLOR, getCarColor } from '../parts/colors.js';

/** @summary localStorage key of the versioned profile JSON. */
export const PROFILE_KEY = 'race_profile_v1';

/** @summary Pre-profile best-time key (Mata Atlântica). Read once, never written or removed. */
export const LEGACY_BEST_KEY = 'race_best_time';

const PROFILE_VERSION = 1;
const LEGACY_BEST_STAGE = 'mata-atlantica';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isPositiveNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // access itself can throw (blocked site data)
  }
}

function readItem(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeItem(storage, key, value) {
  try {
    if (storage) storage.setItem(key, value);
  } catch {
    // quota / private mode: keep the in-memory profile only
  }
}

function parseJson(raw) {
  try {
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function sanitizeGarage(g) {
  const src = isPlainObject(g) ? g : {};
  return {
    color: getCarColor(src.color) ? src.color : DEFAULT_COLOR,
    tire: Object.hasOwn(TIRES, src.tire) ? src.tire : DEFAULT_PARTS.tire,
    gearbox: Object.hasOwn(GEARBOXES, src.gearbox) ? src.gearbox : DEFAULT_PARTS.gearbox,
    // RF-012 parts (EP-008): profiles saved before them simply load the defaults (no migration).
    engine: Object.hasOwn(ENGINES, src.engine) ? src.engine : DEFAULT_PARTS.engine,
    chassis: Object.hasOwn(CHASSIS, src.chassis) ? src.chassis : DEFAULT_PARTS.chassis,
    tank: Object.hasOwn(TANKS, src.tank) ? src.tank : DEFAULT_PARTS.tank,
  };
}

/**
 * Creates the profile over `storage`. `stages` is the ordered visible stage list (`listStages()`):
 * the first one is always unlocked and a win unlocks the next one in that order. Corrupted JSON or
 * unknown part/color ids fall back to defaults (a profile saved before the engine/chassis/tank parts
 * loads them as DEFAULT_PARTS, so getGarage() is always safe for resolveCarParams).
 * `garage.upgrades` is reserved for future upgrades: kept as stored, not exposed by getGarage.
 * @summary Build the profile API `{ getGarage, saveGarage, getUnlocked, isUnlocked, getBest, recordWin }`.
 * @param {Storage | null} [storage] defaults to `localStorage` (null = memory only)
 * @param {Array<{ id: string }>} [stages] ordered stages, as returned by `listStages()`
 */
export function createProfile(storage = defaultStorage(), stages = []) {
  const stageIds = (stages ?? []).map((s) => s.id);
  const firstId = stageIds[0] ?? LEGACY_BEST_STAGE;
  const data = load();

  function load() {
    const raw = parseJson(readItem(storage, PROFILE_KEY));
    const src = isPlainObject(raw) ? raw : {};
    const garageSrc = isPlainObject(src.garage) ? src.garage : {};
    const progressSrc = isPlainObject(src.progress) ? src.progress : {};

    const unlocked = Array.isArray(progressSrc.unlocked)
      ? [...new Set(progressSrc.unlocked.filter((id) => typeof id === 'string'))]
      : [];
    if (!unlocked.includes(firstId)) unlocked.unshift(firstId);

    const best = {};
    if (isPlainObject(progressSrc.best)) {
      for (const [id, t] of Object.entries(progressSrc.best)) if (isPositiveNumber(t)) best[id] = t;
    }

    const loaded = {
      version: PROFILE_VERSION,
      garage: {
        ...sanitizeGarage(garageSrc),
        upgrades: isPlainObject(garageSrc.upgrades) ? garageSrc.upgrades : {},
      },
      progress: { unlocked, best },
    };

    let migrated = false;
    if (best[LEGACY_BEST_STAGE] === undefined) {
      const legacy = parseFloat(readItem(storage, LEGACY_BEST_KEY));
      if (isPositiveNumber(legacy)) {
        best[LEGACY_BEST_STAGE] = legacy;
        migrated = true;
      }
    }
    if (migrated) persist(loaded);
    return loaded;
  }

  function persist(value = data) {
    writeItem(storage, PROFILE_KEY, JSON.stringify(value));
  }

  /** @returns {{ color: string, tire: string, gearbox: string, engine: string, chassis: string, tank: string }} */
  function getGarage() {
    const { color, tire, gearbox, engine, chassis, tank } = data.garage;
    return { color, tire, gearbox, engine, chassis, tank };
  }

  return {
    getGarage,
    /** Saves a garage choice; invalid ids fall back to the default of that field. */
    saveGarage(choice) {
      data.garage = { ...sanitizeGarage(choice), upgrades: data.garage.upgrades };
      persist();
      return getGarage();
    },
    getUnlocked() {
      return data.progress.unlocked.slice();
    },
    isUnlocked(id) {
      return data.progress.unlocked.includes(id);
    },
    /** Best winning time for a stage in seconds, or null. */
    getBest(stageId) {
      return data.progress.best[stageId] ?? null;
    },
    /**
     * Records a win: unlocks the next stage in `stages` order and keeps the best time.
     * @returns {{ best: number | null, isNewBest: boolean, unlockedId: string | null }}
     */
    recordWin(stageId, time) {
      const { unlocked, best } = data.progress;
      if (!unlocked.includes(stageId)) unlocked.push(stageId);
      const idx = stageIds.indexOf(stageId);
      const nextId = idx >= 0 ? stageIds[idx + 1] ?? null : null;
      let unlockedId = null;
      if (nextId && !unlocked.includes(nextId)) {
        unlocked.push(nextId);
        unlockedId = nextId;
      }
      const prev = best[stageId];
      const isNewBest = isPositiveNumber(time) && (prev === undefined || time < prev);
      if (isNewBest) best[stageId] = time;
      persist();
      return { best: best[stageId] ?? null, isNewBest, unlockedId };
    },
  };
}
