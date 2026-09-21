// Pure stage registry. No three.js, no DOM.
import { SURFACE_TYPES, FEATURE_TYPES } from '../track/track.js';

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function requireNumbers(obj, keys, where) {
  for (const k of keys) {
    if (!isFiniteNumber(obj[k])) throw new Error(`${where}: '${k}' must be a finite number`);
  }
}

/** Throws if the stage data does not match the stage contract. */
export function validateStage(stage) {
  if (!stage || typeof stage.id !== 'string' || stage.id === '') {
    throw new Error('stage: missing string id');
  }
  const where = `stage '${stage.id}'`;
  const track = stage.track;
  if (!track || !isFiniteNumber(track.finishX)) {
    throw new Error(`${where}: track.finishX must be a finite number`);
  }
  for (const n of track.noise || []) requireNumbers(n, ['amp', 'freq', 'phase'], `${where} noise`);
  for (const s of track.slopes || []) {
    requireNumbers(s, ['x', 'w', 'dh'], `${where} slope`);
    if (s.w <= 0) throw new Error(`${where} slope: 'w' must be > 0`);
  }
  for (const f of track.features || []) {
    if (!FEATURE_TYPES.includes(f.type)) {
      throw new Error(`${where}: unknown feature.type '${f.type}'`);
    }
    requireNumbers(f, ['x', 'w', 'h'], `${where} feature`);
  }
  const surfaces = stage.surfaces || {};
  if (surfaces.default !== undefined && !SURFACE_TYPES.includes(surfaces.default)) {
    throw new Error(`${where}: unknown surface.type '${surfaces.default}'`);
  }
  for (const z of surfaces.zones || []) {
    if (!SURFACE_TYPES.includes(z.type)) {
      throw new Error(`${where}: unknown surface.type '${z.type}'`);
    }
    requireNumbers(z, ['from', 'to'], `${where} surface zone`);
    if (z.from >= z.to) throw new Error(`${where} surface zone: 'from' must be < 'to'`);
  }
}

/**
 * @param {Record<string, {default: object}>} modules map of module path -> module
 *   (the shape returned by Vite's import.meta.glob with eager: true).
 */
export function createRegistry(modules) {
  const byId = new Map();
  for (const mod of Object.values(modules)) {
    const stage = mod.default;
    validateStage(stage);
    if (byId.has(stage.id)) throw new Error(`duplicate stage id '${stage.id}'`);
    byId.set(stage.id, stage);
  }

  const order = (s) => (isFiniteNumber(s.order) ? s.order : Infinity);
  const visible = [...byId.values()]
    .filter((s) => !s.hidden)
    .sort((a, b) => order(a) - order(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return {
    getStage: (id) => byId.get(id),
    listStages: () => visible.slice(),
    getDefaultStage() {
      if (visible.length === 0) throw new Error('no visible stage registered');
      return visible[0];
    },
  };
}
