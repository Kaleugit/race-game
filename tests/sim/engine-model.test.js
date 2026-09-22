// EP-007-01: pure engine model driven by the sim harness on Mata Atlântica. Checks RPM limits,
// ratio-based drop on every upshift, firing-frequency range, gearbox preset ordering, airborne
// free-rev and purity (no Web Audio / DOM).
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

// Runs a race with the gearbox preset and feeds every physics step to a fresh engine model.
function engineRun(gearbox, kind = 'throttle') {
  const { driver, initialState } = DRIVERS[kind];
  const params = resolveCarParams(BASE_PARAMS, { tire: 'misto', gearbox });
  const race = runRace({ stage: mata, params, driver, initialState });
  const model = createEngineModel({ gearboxPreset: gearbox });
  const out = race.samples.map((s) => ({ ...s, ...model.update(DT, { speed: s.speed, throttle: 1, airborne: s.airborne }) }));
  const upshifts = [];
  for (let i = 1; i < out.length; i++) {
    if (out[i].gear > out[i - 1].gear) upshifts.push({ from: out[i - 1], to: out[i] });
  }
  return { race, out, upshifts, ratios: model.gearRatios };
}

const RUNS = ['curta', 'padrao', 'longa'].flatMap((g) => ['throttle', 'turbo'].map((k) => [`${g}/${k}`, engineRun(g, k)]));

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
  // With turbo the car reaches top gear, and top gear at top speed stays below the redline.
  const turbo = RUNS.find(([n]) => n === 'padrao/turbo')[1];
  assert.equal(Math.max(...turbo.out.map((o) => o.gear)), ENGINE_DEFAULTS.gearRatios.length);
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
