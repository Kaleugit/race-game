// EP-008-13 free-roam mode: the stage contract of `mode: 'free'`, the shape of the 5 km terrain
// (length, zones, features, climbs), the warning signs it inherits from EP-008-12, and the fact that
// the terrain is actually drivable end to end with the reference input — plus the guarantees the
// free-roam stages must keep so the race ladder and its CA-004/CA-009 tests never see them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrack, SURFACE_TYPES, FEATURE_TYPES } from '../../src/track/track.js';
import { validateStage, STAGE_MODES, stageMode, isFreeRoam } from '../../src/stages/registry.js';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { DEFAULT_PARTS, resolveCarParams } from '../../src/parts/presets.js';
import { SIGN_LEAD_M, signPositions } from '../../src/stages/hazard-signs.js';
import { loadStages, loadStageModules } from './load-stages.js';
import { runRace } from './harness.js';
import { createReferenceDriver } from './reference-driver.js';

const FREE_ID = 'terra-livre';
const FREE_TEST_ID = 'livre-teste';
const FREE_LENGTH_M = 5000;

const registry = await loadStages();
const allStages = Object.values(await loadStageModules()).map((m) => m.default);
const freeStages = allStages.filter(isFreeRoam);
const free = registry.getStage(FREE_ID);
const params = resolveCarParams(BASE_PARAMS, DEFAULT_PARTS);

test('the stage contract knows exactly two modes and defaults to race', () => {
  assert.deepEqual(STAGE_MODES, ['race', 'free']);
  assert.equal(stageMode({ id: 'x' }), 'race');
  assert.equal(isFreeRoam({ id: 'x' }), false);
  assert.equal(isFreeRoam({ id: 'x', mode: 'free' }), true);
  assert.throws(
    () => validateStage({ id: 'x', mode: 'livre', track: { finishX: 10 } }),
    /stage\.mode/,
  );
});

test('the free-roam stages stay out of the race ladder (listStages) but are reachable by id', () => {
  assert.deepEqual(freeStages.map((s) => s.id).sort(), [FREE_TEST_ID, FREE_ID].sort());
  for (const s of freeStages) {
    assert.equal(s.hidden, true, `${s.id} must be hidden`);
    assert.equal(registry.getStage(s.id).id, s.id);
    assert.ok(!registry.listStages().some((v) => v.id === s.id), `${s.id} leaked into listStages()`);
    // No opponent data at all: a free-roam stage cannot be raced by accident.
    assert.equal(s.bot, undefined, `${s.id} must not carry a bot block`);
  }
  for (const s of registry.listStages()) assert.equal(stageMode(s), 'race', s.id);
});

test(`${FREE_ID} is a valid ${FREE_LENGTH_M} m free-roam stage`, () => {
  assert.doesNotThrow(() => validateStage(free));
  assert.equal(free.mode, 'free');
  assert.equal(free.track.finishX, FREE_LENGTH_M);
  assert.equal(createTrack(free).finishX, FREE_LENGTH_M);
});

test(`${FREE_ID} mixes dirt, mud and sand over the whole 5 km`, () => {
  const zones = free.surfaces.zones;
  assert.equal(free.surfaces.default, 'dirt');
  const types = new Set(zones.map((z) => z.type));
  assert.deepEqual([...types].sort(), ['mud', 'sand']);
  for (const z of zones) {
    assert.ok(SURFACE_TYPES.includes(z.type), z.type);
    assert.ok(z.from >= 0 && z.to <= FREE_LENGTH_M, `zone ${z.from}-${z.to} off the terrain`);
    assert.ok(z.to - z.from >= 30, `zone ${z.from}-${z.to} too short to be felt`);
  }
  // Ascending, never overlapping, and far enough apart that each one earns its own warning sign.
  for (let i = 1; i < zones.length; i++) {
    assert.ok(zones[i].from - zones[i - 1].to >= SIGN_LEAD_M, `zones ${i - 1}/${i} too close`);
  }
  // The variety is spread out: at least one hazard in each 1 km of the terrain.
  for (let km = 0; km < 5; km++) {
    const inKm = zones.filter((z) => z.from >= km * 1000 && z.from < (km + 1) * 1000);
    assert.ok(inKm.length >= 2, `km ${km} has only ${inKm.length} hazard(s)`);
  }
  const track = createTrack(free);
  assert.equal(track.surfaceAt(0), 'dirt');
  assert.equal(track.surfaceAt(zones[0].from), zones[0].type);
});

test(`${FREE_ID} keeps a varied shape: climbs, dips and jumps in every section`, () => {
  const { features, slopes } = free.track;
  for (const f of features) {
    assert.ok(FEATURE_TYPES.includes(f.type), f.type);
    assert.ok(f.x > 0 && f.x < FREE_LENGTH_M, `feature at ${f.x} off the terrain`);
    assert.ok(f.h > 0 && f.h <= 2, `feature at ${f.x} height ${f.h}`);
  }
  // Every 500 m section has terrain of its own: nothing is a blank stretch.
  for (let s = 0; s < 10; s++) {
    const inSection = features.filter((f) => f.x >= s * 500 && f.x < (s + 1) * 500);
    assert.ok(inSection.length >= 5, `section ${s} has only ${inSection.length} feature(s)`);
  }
  const kinds = new Set(features.map((f) => f.type));
  assert.deepEqual([...kinds].sort(), [...FEATURE_TYPES].sort(), 'all feature kinds are used');
  // Jumps: asym kickers of at least 1.3 m, spread across the run.
  const jumps = features.filter((f) => f.type === 'asym' && f.h >= 1.3);
  assert.ok(jumps.length >= 6, `only ${jumps.length} jumps`);
  // Climbs and descents, and slope ramps that never overlap each other.
  assert.ok(slopes.some((s) => s.dh >= 12), 'no real climb');
  assert.ok(slopes.some((s) => s.dh <= -12), 'no real descent');
  const sorted = [...slopes].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].x + sorted[i - 1].w / 2;
    assert.ok(sorted[i].x - sorted[i].w / 2 >= prevEnd, `slopes overlap around ${sorted[i].x}`);
  }
});

test(`${FREE_ID} is steep enough to be interesting and never steeper than the hardest race stage`, () => {
  const track = createTrack(free);
  const mataMax = 0.86; // EP-008-01: the steepest point of Mata Atlântica, known to be climbable
  let max = 0;
  let minH = Infinity;
  let maxH = -Infinity;
  for (let x = 0; x <= FREE_LENGTH_M; x += 0.5) {
    max = Math.max(max, Math.abs(track.slopeAt(x)));
    const h = track.heightAt(x);
    minH = Math.min(minH, h);
    maxH = Math.max(maxH, h);
  }
  assert.ok(max > 0.3, `terrain too flat (max slope ${max.toFixed(3)})`);
  assert.ok(max <= mataMax, `max slope ${max.toFixed(3)} steeper than Mata Atlântica`);
  assert.ok(maxH - minH > 20, `elevation range only ${(maxH - minH).toFixed(1)} m`);
});

test('every free-roam stage gets one EP-008-12 warning sign per hazard, none dropped', () => {
  for (const stage of freeStages) {
    const zones = stage.surfaces.zones;
    const signs = signPositions(stage);
    assert.equal(signs.length, zones.length, `${stage.id}: ${signs.length} signs for ${zones.length} hazards`);
    assert.ok(zones[0].from > SIGN_LEAD_M, `${stage.id}: the first hazard leaves no room for a sign`);
    for (const [i, z] of zones.entries()) {
      assert.deepEqual(signs[i], { x: z.from - SIGN_LEAD_M, type: z.type, hazardFrom: z.from });
      assert.ok(signs[i].x >= 0 && signs[i].x < stage.track.finishX);
    }
  }
  assert.equal(signPositions(free).length, 21);
});

test(`${FREE_ID} is drivable end to end with the reference input, without ever getting stuck`, () => {
  const track = createTrack(free);
  const r = runRace({ stage: free, params, driver: createReferenceDriver(track), maxTime: 400 });
  assert.equal(r.finished, true, `stuck at x ${r.samples.at(-1).x.toFixed(1)} of ${FREE_LENGTH_M}`);
  // A 5 km ride, not a sprint: comfortably longer than a race stage (30-45 s) and not a slog.
  assert.ok(r.finishTime > 90 && r.finishTime < 300, `${r.finishTime.toFixed(2)}s`);
  // Never parked: the car is below walking pace for at most 3 s in a row anywhere on the terrain.
  let stallStart = null;
  let longest = 0;
  for (const s of r.samples) {
    if (s.speed < 1) {
      stallStart ??= s.t;
      longest = Math.max(longest, s.t - stallStart);
    } else {
      stallStart = null;
    }
  }
  assert.ok(longest < 3, `stuck for ${longest.toFixed(2)}s`);
});

test(`${FREE_TEST_ID} is the short free-roam stage the e2e drives to the end screen`, () => {
  const stage = registry.getStage(FREE_TEST_ID);
  assert.doesNotThrow(() => validateStage(stage));
  assert.equal(isFreeRoam(stage), true);
  assert.ok(stage.track.finishX <= 200, `${stage.track.finishX} m is too long for an e2e`);
  const r = runRace({ stage, params, driver: createReferenceDriver(createTrack(stage)) });
  assert.equal(r.finished, true);
  assert.ok(r.finishTime < 20, `${r.finishTime.toFixed(2)}s`);
});
