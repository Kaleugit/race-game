// RF-003 / RF-007 local profile (EP-006-01): defaults on empty/corrupted storage, sequential unlock
// persisted across profile instances (CA-002 unit part), garage persistence (CA-007 unit part),
// the legacy `race_best_time` key preserved byte for byte, and the bot never inheriting the garage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { DEFAULT_PARTS, resolveCarParams } from '../../src/parts/presets.js';
import { CAR_COLORS, DEFAULT_COLOR, getCarColor } from '../../src/parts/colors.js';
import { createProfile, PROFILE_KEY, LEGACY_BEST_KEY, DEFAULT_SETTINGS } from '../../src/profile/profile.js';
import { BOT_DEFAULT_PARTS, resolveBotParams } from '../../src/bot/bot-preset.js';
import { loadStages } from './load-stages.js';

const registry = await loadStages();
const STAGES = registry.listStages();

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

// The profile stores color + the five parts (tire, gearbox and, since EP-008-04, engine/chassis/tank).
const DEFAULT_GARAGE = {
  color: DEFAULT_COLOR,
  tire: DEFAULT_PARTS.tire,
  gearbox: DEFAULT_PARTS.gearbox,
  engine: DEFAULT_PARTS.engine,
  chassis: DEFAULT_PARTS.chassis,
  tank: DEFAULT_PARTS.tank,
};

// Race options stored beside the garage (EP-008-11). Spelled out here so a new option has to be
// added on purpose, never by copying the implementation's own object.
const DEFAULT_SETTINGS_SHAPE = { ghostBot: false };

test('visible stage order is mata-atlantica then cerrado', () => {
  assert.deepEqual(STAGES.map((s) => s.id), ['mata-atlantica', 'cerrado']);
});

test('CAR_COLORS has 10 unique colors and DEFAULT_COLOR is the Bandeirante red', () => {
  assert.equal(CAR_COLORS.length, 10);
  assert.equal(new Set(CAR_COLORS.map((c) => c.id)).size, 10);
  for (const c of CAR_COLORS) {
    assert.equal(typeof c.label, 'string');
    assert.ok(Number.isInteger(c.hex) && c.hex >= 0 && c.hex <= 0xffffff);
  }
  assert.equal(getCarColor(DEFAULT_COLOR).hex, 0xb71f1f);
});

test('empty storage: only the first stage unlocked, default garage', () => {
  const p = createProfile(memoryStorage(), STAGES);
  assert.deepEqual(p.getUnlocked(), ['mata-atlantica']);
  assert.equal(p.isUnlocked('mata-atlantica'), true);
  assert.equal(p.isUnlocked('cerrado'), false);
  assert.deepEqual(p.getGarage(), DEFAULT_GARAGE);
  assert.equal(p.getBest('mata-atlantica'), null);
});

test('recordWin unlocks the next stage and persists across profile instances', () => {
  const storage = memoryStorage();
  const res = createProfile(storage, STAGES).recordWin('mata-atlantica', 74.2);
  assert.deepEqual(res, { best: 74.2, isNewBest: true, unlockedId: 'cerrado' });
  const again = createProfile(storage, STAGES);
  assert.equal(again.isUnlocked('cerrado'), true);
  assert.equal(again.getBest('mata-atlantica'), 74.2);
  // Winning the last stage unlocks nothing new; a slower win keeps the best time.
  assert.equal(again.recordWin('cerrado', 85).unlockedId, null);
  assert.deepEqual(again.recordWin('mata-atlantica', 80), { best: 74.2, isNewBest: false, unlockedId: null });
});

test('stored JSON shape: version, garage.upgrades slot, progress, settings', () => {
  const storage = memoryStorage();
  createProfile(storage, STAGES).recordWin('mata-atlantica', 70);
  assert.deepEqual(JSON.parse(storage.getItem(PROFILE_KEY)), {
    version: 1,
    garage: { ...DEFAULT_GARAGE, upgrades: {} },
    progress: { unlocked: ['mata-atlantica', 'cerrado'], best: { 'mata-atlantica': 70 } },
    settings: DEFAULT_SETTINGS_SHAPE,
  });
});

test('garage choice survives a new profile instance; upgrades slot is kept untouched', () => {
  const upgrades = { engine: 2 };
  const storage = memoryStorage({
    [PROFILE_KEY]: JSON.stringify({ version: 1, garage: { ...DEFAULT_GARAGE, upgrades } }),
  });
  const choice = { color: 'azul', tire: 'offroad', gearbox: 'longa', engine: 'e16', chassis: 'pesado', tank: 'grande' };
  assert.deepEqual(createProfile(storage, STAGES).saveGarage(choice), choice);
  assert.deepEqual(createProfile(storage, STAGES).getGarage(), choice);
  assert.deepEqual(JSON.parse(storage.getItem(PROFILE_KEY)).garage.upgrades, upgrades);
  // getGarage() feeds resolveCarParams directly (EP-006-04).
  assert.doesNotThrow(() => resolveCarParams(BASE_PARAMS, createProfile(storage, STAGES).getGarage()));
});

test('invalid values fall back to defaults without throwing', () => {
  const corrupted = ['{not json', 'null', '42', '[]', '"x"', JSON.stringify({ garage: 'x', progress: [] })];
  for (const raw of corrupted) {
    const p = createProfile(memoryStorage({ [PROFILE_KEY]: raw }), STAGES);
    assert.deepEqual(p.getGarage(), DEFAULT_GARAGE, raw);
    assert.deepEqual(p.getUnlocked(), ['mata-atlantica'], raw);
  }
  const bad = memoryStorage({
    [PROFILE_KEY]: JSON.stringify({
      garage: { color: 'rosa-neon', tire: 'slick', gearbox: 7, engine: 'v8', chassis: null, tank: 3, upgrades: [1] },
      progress: { unlocked: [3, 'cerrado'], best: { 'mata-atlantica': 'fast', cerrado: -1 } },
    }),
  });
  const p = createProfile(bad, STAGES);
  assert.deepEqual(p.getGarage(), DEFAULT_GARAGE);
  assert.deepEqual(p.getUnlocked(), ['mata-atlantica', 'cerrado']);
  assert.equal(p.getBest('mata-atlantica'), null);
  assert.equal(p.getBest('cerrado'), null);
  assert.deepEqual(p.saveGarage({ color: 'verde', tire: 'nope', gearbox: 'curta', engine: 'e24', chassis: 'x', tank: 'pequeno' }), {
    ...DEFAULT_GARAGE, color: 'verde', gearbox: 'curta', engine: 'e24', tank: 'pequeno',
  });
  // Prototype keys are not part ids.
  assert.deepEqual(p.saveGarage({ engine: 'toString', chassis: '__proto__', tank: 'constructor' }), DEFAULT_GARAGE);
});

test('throwing or missing storage: memory-only profile, no exception', () => {
  const throwing = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  };
  for (const storage of [throwing, null]) {
    const p = createProfile(storage, STAGES);
    assert.deepEqual(p.getGarage(), DEFAULT_GARAGE);
    assert.equal(p.recordWin('mata-atlantica', 60).unlockedId, 'cerrado');
    assert.equal(p.isUnlocked('cerrado'), true);
  }
});

test('race_best_time is copied into progress.best and preserved byte for byte', () => {
  const legacy = '73.456';
  const storage = memoryStorage({ [LEGACY_BEST_KEY]: legacy });
  const p = createProfile(storage, STAGES);
  assert.equal(p.getBest('mata-atlantica'), 73.456);
  p.recordWin('mata-atlantica', 70.1);
  p.saveGarage({ color: 'preto', tire: 'estrada', gearbox: 'curta' });
  assert.equal(storage.getItem(LEGACY_BEST_KEY), legacy);
  assert.equal(createProfile(storage, STAGES).getBest('mata-atlantica'), 70.1);
  assert.equal(storage.getItem(LEGACY_BEST_KEY), legacy);
  // An existing profile best is not overwritten by the legacy key.
  const withBest = memoryStorage({
    [LEGACY_BEST_KEY]: '50',
    [PROFILE_KEY]: JSON.stringify({ progress: { best: { 'mata-atlantica': 65 } } }),
  });
  assert.equal(createProfile(withBest, STAGES).getBest('mata-atlantica'), 65);
  assert.equal(withBest.getItem(LEGACY_BEST_KEY), '50');
});

test('the bot never inherits the player garage choice (CA-007)', () => {
  const storage = memoryStorage();
  createProfile(storage, STAGES).saveGarage({ color: 'roxo', tire: 'offroad', gearbox: 'curta' });
  for (const stage of STAGES) {
    const expected = resolveCarParams(BASE_PARAMS, stage.bot?.parts ?? BOT_DEFAULT_PARTS);
    assert.deepEqual(resolveBotParams(stage), expected, stage.id);
    assert.notDeepEqual(resolveBotParams(stage), resolveCarParams(BASE_PARAMS, createProfile(storage, STAGES).getGarage()));
  }
});

test('EP-008-04: old profile without engine/chassis/tank loads the defaults, non-destructively', () => {
  const old = {
    version: 1,
    garage: { color: 'azul', tire: 'offroad', gearbox: 'longa', upgrades: { engine: 2 } },
    progress: { unlocked: ['mata-atlantica', 'cerrado'], best: { 'mata-atlantica': 44.5 } },
  };
  const storage = memoryStorage({ [PROFILE_KEY]: JSON.stringify(old) });
  const p = createProfile(storage, STAGES);
  const garage = p.getGarage();
  assert.deepEqual(garage, { ...DEFAULT_GARAGE, color: 'azul', tire: 'offroad', gearbox: 'longa' });
  // Loading alone does not rewrite the stored profile.
  assert.deepEqual(JSON.parse(storage.getItem(PROFILE_KEY)), old);
  assert.equal(p.isUnlocked('cerrado'), true);
  assert.equal(p.getBest('mata-atlantica'), 44.5);
  // The old choice resolves to exactly the pre-EP-008 car (default engine/chassis/tank = identity).
  assert.deepEqual(
    resolveCarParams(BASE_PARAMS, garage),
    resolveCarParams(BASE_PARAMS, { tire: 'offroad', gearbox: 'longa' }),
  );
  // Saving new parts keeps progress and the upgrades slot.
  p.saveGarage({ ...garage, engine: 'e24', chassis: 'leve', tank: 'pequeno' });
  const stored = JSON.parse(storage.getItem(PROFILE_KEY));
  assert.deepEqual(stored.progress, old.progress);
  assert.deepEqual(stored.garage, { ...garage, engine: 'e24', chassis: 'leve', tank: 'pequeno', upgrades: { engine: 2 } });
});

test('EP-008-11: ghost bot option defaults to off and survives a new profile instance', () => {
  assert.deepEqual(DEFAULT_SETTINGS, DEFAULT_SETTINGS_SHAPE);
  assert.equal(Object.isFrozen(DEFAULT_SETTINGS), true);
  const storage = memoryStorage();
  // Default: the bot is shown on the race bar only (current behaviour).
  assert.deepEqual(createProfile(storage, STAGES).getSettings(), { ghostBot: false });
  assert.deepEqual(createProfile(storage, STAGES).saveSettings({ ghostBot: true }), { ghostBot: true });
  assert.deepEqual(createProfile(storage, STAGES).getSettings(), { ghostBot: true });
  assert.deepEqual(JSON.parse(storage.getItem(PROFILE_KEY)).settings, { ghostBot: true });
  // Turning it off again persists too, and the garage/progress are untouched by settings writes.
  const p = createProfile(storage, STAGES);
  p.recordWin('mata-atlantica', 41.5);
  p.saveSettings({ ghostBot: false });
  const stored = JSON.parse(storage.getItem(PROFILE_KEY));
  assert.deepEqual(stored.settings, { ghostBot: false });
  assert.deepEqual(stored.garage, { ...DEFAULT_GARAGE, upgrades: {} });
  assert.equal(stored.progress.best['mata-atlantica'], 41.5);
});

test('EP-008-11: profiles without settings load the default, non-destructively', () => {
  const old = {
    version: 1,
    garage: { ...DEFAULT_GARAGE, upgrades: { engine: 2 } },
    progress: { unlocked: ['mata-atlantica', 'cerrado'], best: { 'mata-atlantica': 44.5 } },
  };
  const storage = memoryStorage({ [PROFILE_KEY]: JSON.stringify(old) });
  const p = createProfile(storage, STAGES);
  assert.deepEqual(p.getSettings(), { ghostBot: false });
  // Reading alone does not rewrite the stored profile (no migration).
  assert.deepEqual(JSON.parse(storage.getItem(PROFILE_KEY)), old);
  // Saving the option keeps garage, upgrades and progress exactly as they were.
  p.saveSettings({ ghostBot: true });
  const stored = JSON.parse(storage.getItem(PROFILE_KEY));
  assert.deepEqual(stored.garage, old.garage);
  assert.deepEqual(stored.progress, old.progress);
  assert.deepEqual(stored.settings, { ghostBot: true });
});

test('EP-008-11: invalid or unknown settings fall back to the default without throwing', () => {
  const corrupted = ['x', 1, null, [], { ghostBot: 'sim' }, { ghostBot: 1 }, { ghostBot: null }];
  for (const settings of corrupted) {
    const storage = memoryStorage({ [PROFILE_KEY]: JSON.stringify({ version: 1, settings }) });
    assert.deepEqual(createProfile(storage, STAGES).getSettings(), { ghostBot: false }, JSON.stringify(settings));
  }
  const storage = memoryStorage();
  const p = createProfile(storage, STAGES);
  // Unknown keys are dropped and a bad value resets that field only.
  assert.deepEqual(p.saveSettings({ ghostBot: true, nitro: true }), { ghostBot: true });
  assert.deepEqual(p.saveSettings({ ghostBot: 'talvez' }), { ghostBot: false });
  assert.deepEqual(p.saveSettings(undefined), { ghostBot: false });
  assert.deepEqual(JSON.parse(storage.getItem(PROFILE_KEY)).settings, { ghostBot: false });
});

test('EP-008-04: every stored part combination feeds resolveCarParams without throwing', () => {
  const storage = memoryStorage();
  for (const engine of ['e16', 'e20', 'e24']) {
    for (const chassis of ['leve', 'medio', 'pesado']) {
      for (const tank of ['pequeno', 'medio', 'grande']) {
        createProfile(storage, STAGES).saveGarage({ ...DEFAULT_GARAGE, engine, chassis, tank });
        const garage = createProfile(storage, STAGES).getGarage();
        assert.deepEqual([garage.engine, garage.chassis, garage.tank], [engine, chassis, tank]);
        assert.doesNotThrow(() => resolveCarParams(BASE_PARAMS, garage));
      }
    }
  }
});
