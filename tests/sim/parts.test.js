// RF-008/RF-009: tire and gearbox presets, surface grip. CA-008 (>= 3% difference, Off-road beats
// Estrada on sand) and CDC-102 (no preset strictly dominant) measured with the sim harness.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { SURFACE_TYPES } from '../../src/track/track.js';
import { validateStage } from '../../src/stages/registry.js';
import { TIRES, GEARBOXES, DEFAULT_PARTS, resolveCarParams } from '../../src/parts/presets.js';
import { loadStages } from './load-stages.js';
import { runRace } from './harness.js';
import areia, { SAND_FROM, SAND_TO } from './fixtures/areia.stage.js';

const up = () => ({ up: true });
const params = (tire, gearbox) => resolveCarParams(BASE_PARAMS, { tire, gearbox });
const race = (stage, p) => runRace({ stage, params: p, driver: up });

// Near-flat 300 m track entirely on one surface (derived from the sand fixture).
const onSurface = (surface) => ({ ...areia, id: `flat-${surface}`, surfaces: { default: surface, zones: [] } });
const TERRAINS = Object.fromEntries(SURFACE_TYPES.map((s) => [s, onSurface(s)]));

// Seconds from entering the sand stretch to the finish line (end of the sand).
function sandTime(r) {
  const entry = r.samples.find((s) => s.x >= SAND_FROM);
  return r.finishTime - entry.t;
}

function relDiff(a, b) {
  return Math.abs(a - b) / b;
}

test('resolveCarParams(BASE_PARAMS, DEFAULT_PARTS) is deep-equal to BASE_PARAMS (Misto + Padrão identity)', () => {
  assert.deepEqual(DEFAULT_PARTS, { tire: 'misto', gearbox: 'padrao' });
  assert.deepEqual(resolveCarParams(BASE_PARAMS, DEFAULT_PARTS), { ...BASE_PARAMS });
  assert.deepEqual(TIRES.misto.grip, BASE_PARAMS.grip);
  assert.equal(TIRES.misto.topSpeedMult, 1);
  assert.equal(GEARBOXES.padrao.accelMult, 1);
  assert.equal(GEARBOXES.padrao.topSpeedMult, 1);
});

test('presets cover every surface; resolved params are frozen and the base is untouched', () => {
  for (const t of Object.values(TIRES)) {
    assert.deepEqual(Object.keys(t.grip).sort(), [...SURFACE_TYPES].sort());
    assert.ok(typeof t.label === 'string' && t.label.length > 0);
  }
  for (const g of Object.values(GEARBOXES)) assert.ok(typeof g.label === 'string' && g.label.length > 0);
  assert.deepEqual(Object.keys(BASE_PARAMS.surfaceDrag).sort(), [...SURFACE_TYPES].sort());
  assert.equal(BASE_PARAMS.surfaceDrag.dirt, 0);
  const p = params('estrada', 'curta');
  assert.ok(Object.isFrozen(p));
  assert.equal(p.maxSpeedNormal, BASE_PARAMS.maxSpeedNormal * 1.05 * 0.93);
  assert.equal(p.accelTurbo, BASE_PARAMS.accelTurbo * 1.15);
  assert.deepEqual(p.grip, TIRES.estrada.grip);
  assert.equal(BASE_PARAMS.maxSpeedNormal, 250 / 9);
});

test('upgrades multiply on top of the parts; unknown ids throw', () => {
  const p = resolveCarParams(BASE_PARAMS, { ...DEFAULT_PARTS, upgrades: [{ accelMult: 1.1 }, { topSpeedMult: 1.2 }] });
  assert.equal(p.accelNormal, BASE_PARAMS.accelNormal * 1.1);
  assert.equal(p.maxSpeedTurbo, BASE_PARAMS.maxSpeedTurbo * 1.2);
  assert.throws(() => resolveCarParams(BASE_PARAMS, { tire: 'slick', gearbox: 'padrao' }), /unknown tire/);
  assert.throws(() => resolveCarParams(BASE_PARAMS, { tire: 'misto', gearbox: 'cvt' }), /unknown gearbox/);
});

test('sand fixture is a valid stage: dirt run-up then sand to the finish', () => {
  assert.doesNotThrow(() => validateStage(areia));
  assert.equal(areia.track.finishX, SAND_TO);
  assert.ok(SAND_FROM > 0);
});

test('CA-008: every tire and gearbox swap changes race time or max speed by >= 3% (constant up, sand fixture)', () => {
  const ref = race(areia, params('misto', 'padrao'));
  assert.equal(ref.finished, true);
  const swaps = [
    ...Object.keys(TIRES).filter((t) => t !== 'misto').map((t) => [t, 'padrao']),
    ...Object.keys(GEARBOXES).filter((g) => g !== 'padrao').map((g) => ['misto', g]),
  ];
  for (const [tire, gearbox] of swaps) {
    const r = race(areia, params(tire, gearbox));
    assert.equal(r.finished, true, `${tire}/${gearbox}`);
    const d = Math.max(relDiff(r.finishTime, ref.finishTime), relDiff(r.maxSpeed, ref.maxSpeed));
    assert.ok(d >= 0.03, `${tire}/${gearbox}: ${(d * 100).toFixed(2)}%`);
  }
});

test('CA-008: on the sand stretch Off-road is faster than Estrada', () => {
  const road = race(areia, params('estrada', 'padrao'));
  const off = race(areia, params('offroad', 'padrao'));
  assert.ok(sandTime(off) < sandTime(road), `offroad ${sandTime(off)} vs estrada ${sandTime(road)}`);
  assert.ok(off.finishTime < road.finishTime);
});

test('grip only matters off dirt: on the whole-dirt terrain grip mud/sand values have no effect', () => {
  const a = race(TERRAINS.dirt, params('misto', 'padrao'));
  const b = race(TERRAINS.dirt, { ...BASE_PARAMS, grip: { ...BASE_PARAMS.grip, mud: 0.1, sand: 0.1 } });
  assert.equal(a.finishTime, b.finishTime);
  assert.equal(a.maxSpeed, b.maxSpeed);
});

// CDC-102: for every pair of presets each one wins on at least one terrain/metric
// (terrain: dirt, mud, sand; metric: race time, max speed, sprint = time to 40 m from standstill,
// which measures acceleration — RF-009 "curta = mais aceleração").
const SPRINT_X = 40;
function scorecard(p) {
  const out = {};
  for (const [surface, stage] of Object.entries(TERRAINS)) {
    const r = race(stage, p);
    assert.equal(r.finished, true, `must finish on ${surface}`);
    out[`${surface}.time`] = -r.finishTime; // higher is better
    out[`${surface}.maxSpeed`] = r.maxSpeed;
    out[`${surface}.sprint`] = -r.samples.find((s) => s.x >= SPRINT_X).t;
  }
  return out;
}

function assertNoDominance(kind, cards) {
  const ids = Object.keys(cards);
  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      const wins = Object.keys(cards[a]).filter((m) => cards[a][m] > cards[b][m]);
      assert.ok(wins.length > 0, `${kind} '${b}' is strictly dominant over '${a}' on every terrain/metric`);
    }
  }
}

test('CDC-102: no tire is dominant (each pair: each wins somewhere), for every gearbox', () => {
  for (const gearbox of Object.keys(GEARBOXES)) {
    const cards = Object.fromEntries(Object.keys(TIRES).map((t) => [t, scorecard(params(t, gearbox))]));
    assertNoDominance(`tire (gearbox ${gearbox})`, cards);
  }
});

test('CDC-102: no gearbox is dominant (each pair: each wins somewhere), for every tire', () => {
  for (const tire of Object.keys(TIRES)) {
    const cards = Object.fromEntries(Object.keys(GEARBOXES).map((g) => [g, scorecard(params(tire, g))]));
    assertNoDominance(`gearbox (tire ${tire})`, cards);
  }
});

test('default parts keep the real stages unchanged: mata-atlantica has no physical zones', async () => {
  const mata = (await loadStages()).getStage('mata-atlantica');
  const a = race(mata, params('misto', 'padrao'));
  const b = race(mata, BASE_PARAMS);
  assert.equal(a.finishTime, b.finishTime);
  assert.equal(a.maxSpeed, b.maxSpeed);
});

test('CDC-102 check is not vacuous: a tire better everywhere is reported as dominant', () => {
  const cheat = { ...params('estrada', 'padrao'), grip: { dirt: 1, mud: 1, sand: 1 } };
  const cards = { misto: scorecard(params('misto', 'padrao')), cheat: scorecard(cheat) };
  assert.throws(() => assertNoDominance('tire', cards), /'cheat' is strictly dominant over 'misto'/);
});
