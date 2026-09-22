// EP-007-01: pure engine model driven by the sim harness on Mata Atlântica. Checks RPM limits,
// ratio-based drop on every upshift, firing-frequency range, gearbox preset ordering, airborne
// free-rev and purity (no Web Audio / DOM). EP-008-02: longer gears (every gear spans >= 1.3x the
// speed range of the EP-007 gearing, fewer upshifts per race).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { resolveCarParams } from '../../src/parts/presets.js';
import { ENGINE_DEFAULTS, createEngineModel, scaleGearRatios } from '../../src/audio/engine-model.js';
import { loadStages } from './load-stages.js';
import { runRace } from './harness.js';

const DT = 1 / 60;
const { idleRpm, redlineRpm } = ENGINE_DEFAULTS;
const mata = (await loadStages()).getStage('mata-atlantica');

// Deterministic full-throttle drivers (EP-003-02 front-flip driver finishes Mata Atlântica).
const DRIVERS = {
  throttle: { driver: (s) => ({ up: true, right: s.airborne }), initialState: {} },
  turbo: { driver: (s) => ({ up: true, space: true, right: s.airborne }), initialState: { infiniteTurbo: true } },
};

// EP-007 gearing (before EP-008-02 lengthened every gear), kept as the comparison baseline.
const LEGACY = Object.freeze({ finalDrive: 4.5 });

// Runs a race with the gearbox preset and feeds every physics step to a fresh engine model.
function engineRun(gearbox, kind = 'throttle', overrides = {}) {
  const { driver, initialState } = DRIVERS[kind];
  const params = resolveCarParams(BASE_PARAMS, { tire: 'misto', gearbox });
  const race = runRace({ stage: mata, params, driver, initialState });
  const model = createEngineModel({ gearboxPreset: gearbox, ...overrides });
  const out = race.samples.map((s) => ({ ...s, ...model.update(DT, { speed: s.speed, throttle: 1, airborne: s.airborne }) }));
  const upshifts = [];
  for (let i = 1; i < out.length; i++) {
    if (out[i].gear > out[i - 1].gear) upshifts.push({ from: out[i - 1], to: out[i] });
  }
  return { race, out, upshifts, ratios: model.gearRatios };
}

const RUNS = ['curta', 'padrao', 'longa'].flatMap((g) => ['throttle', 'turbo'].map((k) => [`${g}/${k}`, engineRun(g, k)]));
const LEGACY_RUNS = RUNS.map(([name]) => [name, engineRun(...name.split('/'), LEGACY)]);

test('RPM stays in [idle, redline] and firingHz in [25, 140] Hz on every step', () => {
  for (const [name, { out }] of RUNS) {
    for (const o of out) {
      assert.ok(o.rpm >= idleRpm && o.rpm <= redlineRpm, `${name} t=${o.t.toFixed(2)} rpm ${o.rpm}`);
      assert.ok(o.firingHz >= 25 && o.firingHz <= 140, `${name} t=${o.t.toFixed(2)} firingHz ${o.firingHz}`);
      assert.equal(o.firingHz, (o.rpm / 60) * 2);
    }
  }
});

test('every upshift drops RPM by ratio[n+1]/ratio[n] (±5%) and opens a zero-load shift window', () => {
  for (const [name, { upshifts, ratios }] of RUNS) {
    assert.ok(upshifts.length >= 2, `${name}: only ${upshifts.length} upshifts`);
    for (const { from, to } of upshifts) {
      const expected = ratios[to.gear - 1] / ratios[from.gear - 1];
      const actual = to.rpm / from.rpm;
      assert.ok(Math.abs(actual / expected - 1) <= 0.05, `${name} ${from.gear}->${to.gear}: ${actual} vs ${expected}`);
      assert.equal(to.shifting, true);
      assert.equal(to.load, 0);
    }
  }
  // With turbo the car reaches 4th (the longer gearing tops out there, EP-008-02), and top gear at
  // each preset's turbo top speed stays inside [idle, redline].
  const turbo = RUNS.find(([n]) => n === 'padrao/turbo')[1];
  assert.ok(Math.max(...turbo.out.map((o) => o.gear)) >= 4);
  for (const g of ['curta', 'padrao', 'longa']) {
    const top = resolveCarParams(BASE_PARAMS, { tire: 'misto', gearbox: g }).maxSpeedTurbo;
    const rpm = coupledRpmAt(top, scaleGearRatios(ENGINE_DEFAULTS.gearRatios, g).at(-1));
    assert.ok(rpm > idleRpm && rpm < redlineRpm, `${g}: top gear ${rpm} rpm at ${top}`);
  }
});

// Speed at which gear `ratio` turns the engine at `rpm` (inverse of the model's coupled RPM).
function speedAt(rpm, ratio, finalDrive = ENGINE_DEFAULTS.finalDrive) {
  return (rpm * 2 * Math.PI * ENGINE_DEFAULTS.wheelRadius) / (60 * ratio * finalDrive);
}
function coupledRpmAt(speed, ratio, finalDrive = ENGINE_DEFAULTS.finalDrive) {
  return (speed * 60 * ratio * finalDrive) / (2 * Math.PI * ENGINE_DEFAULTS.wheelRadius);
}
// Per-gear speed range under full-throttle acceleration: from entering the gear (previous gear's
// upshift speed, 0 for 1st) to leaving it (upshiftRpm; redlineRpm for top gear).
function gearRanges(ratios, finalDrive) {
  const { upshiftRpm } = ENGINE_DEFAULTS;
  const exits = ratios.map((r, i) => speedAt(i === ratios.length - 1 ? redlineRpm : upshiftRpm, r, finalDrive));
  return exits.map((v, i) => v - (i === 0 ? 0 : exits[i - 1]));
}

test('EP-008-02: every gear spans >= 1.3x the EP-007 speed range, for every gearbox preset', () => {
  for (const g of ['curta', 'padrao', 'longa']) {
    const ratios = scaleGearRatios(ENGINE_DEFAULTS.gearRatios, g);
    const now = gearRanges(ratios, ENGINE_DEFAULTS.finalDrive);
    const before = gearRanges(ratios, LEGACY.finalDrive);
    now.forEach((v, i) => assert.ok(v >= 1.3 * before[i], `${g} gear ${i + 1}: ${v} vs ${before[i]}`));
  }
});

// In the race the engine lags the wheels (rpmResponse), so the first upshift lands a bit before the
// ideal 1.36x of the static ranges; 1.25x still proves the audible gear is clearly longer.
test('EP-008-02: first upshift comes >= 1.25x later in speed and races have fewer upshifts', () => {
  let total = 0;
  let legacyTotal = 0;
  for (const [name, run] of RUNS) {
    const legacy = LEGACY_RUNS.find(([n]) => n === name)[1];
    const [v, v0] = [run, legacy].map(({ upshifts }) => upshifts[0].to.speed);
    assert.ok(v >= 1.25 * v0, `${name}: first upshift at ${v} vs ${v0}`);
    assert.ok(run.upshifts.length <= legacy.upshifts.length, `${name}: ${run.upshifts.length} vs ${legacy.upshifts.length}`);
    total += run.upshifts.length;
    legacyTotal += legacy.upshifts.length;
  }
  assert.ok(total < legacyTotal, `upshifts ${total} vs ${legacyTotal}`);
});

test('Curta shifts earlier (in speed) than Padrão, and Padrão earlier than Longa', () => {
  const firstShiftSpeed = (g) => {
    const { upshifts } = RUNS.find(([n]) => n === `${g}/throttle`)[1];
    return upshifts[0].to.speed;
  };
  const [c, p, l] = ['curta', 'padrao', 'longa'].map(firstShiftSpeed);
  assert.ok(c < p && p < l, `first upshift speeds curta ${c}, padrao ${p}, longa ${l}`);
  const r = (g) => scaleGearRatios(ENGINE_DEFAULTS.gearRatios, g);
  r('curta').forEach((x, i) => assert.ok(x > r('longa')[i]));
  assert.deepEqual(r('padrao'), [...ENGINE_DEFAULTS.gearRatios]);
});

test('airborne with throttle free-revs toward the redline and rejoins the wheels on landing', () => {
  const m = createEngineModel();
  let o;
  for (let i = 0; i < 60; i++) o = m.update(DT, { speed: 5, throttle: 1, airborne: false });
  const ground = o.rpm;
  for (let i = 0; i < 30; i++) o = m.update(DT, { speed: 5, throttle: 1, airborne: true });
  assert.ok(o.rpm > ground + 1000 && o.rpm <= redlineRpm, `air rpm ${o.rpm} vs ground ${ground}`);
  assert.ok(o.load < 1);
  for (let i = 0; i < 30; i++) o = m.update(DT, { speed: 5, throttle: 1, airborne: false });
  assert.ok(Math.abs(o.rpm - ground) < 20, `landed rpm ${o.rpm} vs ${ground}`);
  // Throttle off in the air falls back toward idle.
  for (let i = 0; i < 120; i++) o = m.update(DT, { speed: 5, throttle: 0, airborne: true });
  assert.ok(o.rpm < idleRpm + 50);
});

test('downshifts when RPM falls below downshiftRpm; idles at standstill', () => {
  const m = createEngineModel();
  let o;
  for (let v = 0; v <= 40; v += 0.1) o = m.update(DT, { speed: v, throttle: 1 });
  assert.ok(o.gear >= 4, `gear ${o.gear} at 40`);
  for (let v = 40; v >= 0; v -= 0.1) o = m.update(DT, { speed: v, throttle: 0 });
  for (let i = 0; i < 60; i++) o = m.update(DT, { speed: 0, throttle: 0 });
  assert.equal(o.gear, 1);
  assert.ok(Math.abs(o.rpm - idleRpm) < 1, `standstill rpm ${o.rpm}`);
  assert.ok(Math.abs(o.firingHz - (idleRpm / 60) * 2) < 0.1);
});

test('unknown gearbox preset throws; model has no Web Audio / DOM access', () => {
  assert.throws(() => createEngineModel({ gearboxPreset: 'nope' }), /unknown gearbox/);
  const src = readFileSync(new URL('../../src/audio/engine-model.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /AudioContext|window|document/);
  // wheelRadius default mirrors WHEEL_RADIUS in src/car.js (three.js module, not importable here).
  const car = readFileSync(new URL('../../src/car.js', import.meta.url), 'utf8');
  assert.match(car, new RegExp(`export const WHEEL_RADIUS = ${ENGINE_DEFAULTS.wheelRadius};`));
});
