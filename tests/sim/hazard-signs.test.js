// EP-008-12: every hazard (a surface zone whose type differs from the stage default surface)
// is announced by exactly one warning sign placed SIGN_LEAD_M = 20 m before the hazard starts.
// The positions are derived from stage data only, so a new stage is covered without a new test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGN_LEAD_M,
  MIN_SIGN_X,
  hazardZones,
  hazardRuns,
  signPositions,
} from '../../src/stages/hazard-signs.js';
import { loadStageModules } from './load-stages.js';

const modules = await loadStageModules();
const allStages = Object.values(modules).map((m) => m.default);

function stub(zones, def = 'dirt') {
  return {
    id: 'stub',
    track: { finishX: 2000, noise: [], slopes: [], features: [] },
    surfaces: { default: def, zones },
  };
}

test('the lead distance is the 20 m the manager asked for', () => {
  assert.equal(SIGN_LEAD_M, 20);
});

test('a hazard is any zone whose surface differs from the stage default', () => {
  const s = stub([
    { from: 100, to: 150, type: 'mud' },
    { from: 300, to: 340, type: 'dirt' }, // same as the default: not a hazard
    { from: 500, to: 560, type: 'sand' },
  ]);
  assert.deepEqual(hazardZones(s).map((z) => z.type), ['mud', 'sand']);
  assert.deepEqual(signPositions(s).map((x) => x.x), [80, 480]);
});

test('the default surface is what defines a hazard, not the surface name', () => {
  // A desert-style stage whose default is sand: the sand is the road, the mud is the trap.
  const s = stub([{ from: 200, to: 260, type: 'mud' }, { from: 400, to: 460, type: 'sand' }], 'sand');
  assert.deepEqual(signPositions(s).map((x) => x.x), [180]);
});

test('each sign carries the hazard it announces', () => {
  const [sign] = signPositions(stub([{ from: 90, to: 120, type: 'sand' }]));
  assert.deepEqual(sign, { x: 70, type: 'sand', hazardFrom: 90 });
});

test('zones closer than 20 m merge into one run: a single sign, no stacking', () => {
  const s = stub([
    { from: 100, to: 150, type: 'mud' },
    { from: 160, to: 200, type: 'sand' }, // gap 10 m < 20 m -> merged
    { from: 200, to: 240, type: 'mud' },  // contiguous -> merged
  ]);
  assert.deepEqual(hazardRuns(s), [{ from: 100, to: 240, type: 'mud' }]);
  assert.deepEqual(signPositions(s).map((x) => x.x), [80]);
});

test('a gap of exactly 20 m is far enough for a second sign', () => {
  const s = stub([{ from: 100, to: 150, type: 'mud' }, { from: 170, to: 200, type: 'sand' }]);
  assert.deepEqual(signPositions(s).map((x) => x.x), [80, 150]);
});

test('overlapping and unsorted zones still produce ascending, non-stacked signs', () => {
  const s = stub([
    { from: 600, to: 660, type: 'sand' },
    { from: 100, to: 200, type: 'mud' },
    { from: 150, to: 260, type: 'mud' },
  ]);
  assert.deepEqual(signPositions(s).map((x) => x.x), [80, 580]);
});

test('a hazard too close to the start line gets no sign (no room for the warning)', () => {
  assert.deepEqual(signPositions(stub([{ from: 15, to: 40, type: 'mud' }])), []);
  assert.deepEqual(signPositions(stub([{ from: 20, to: 40, type: 'mud' }])).map((x) => x.x), [MIN_SIGN_X]);
});

test('a stage with no hazards gets no signs', () => {
  assert.deepEqual(signPositions(stub([])), []);
  assert.deepEqual(signPositions({ id: 'bare', track: { finishX: 100 } }), []);
});

test('every registered stage (hidden included) has at least one hazard to warn about', () => {
  assert.ok(allStages.length >= 3, `only ${allStages.length} stages found`);
  for (const stage of allStages) {
    assert.ok(hazardZones(stage).length > 0, `${stage.id} has no hazard zone`);
  }
});

for (const stage of allStages) {
  test(`(${stage.id}) exactly one sign 20 m before each hazard run, none stacked`, () => {
    const runs = hazardRuns(stage);
    const signs = signPositions(stage);
    const expected = runs.filter((r) => r.from - SIGN_LEAD_M >= MIN_SIGN_X);
    assert.equal(signs.length, expected.length);
    for (const [i, run] of expected.entries()) {
      assert.equal(signs[i].hazardFrom, run.from);
      assert.equal(signs[i].x, run.from - SIGN_LEAD_M, `sign for hazard at ${run.from}`);
      assert.ok(signs[i].x >= 0 && signs[i].x < stage.track.finishX, `sign off the track at ${signs[i].x}`);
    }
    for (let i = 1; i < signs.length; i++) {
      assert.ok(signs[i].x - signs[i - 1].x >= SIGN_LEAD_M, `signs stacked at ${signs[i].x}`);
    }
  });
}

test('shipped stages: the exact sign positions the manager will see', () => {
  const by = (id) => allStages.find((s) => s.id === id);
  const at = (id) => signPositions(by(id)).map((s) => [s.x, s.type]);
  assert.deepEqual(at('mata-atlantica'), [[910, 'mud'], [1200, 'mud']]);
  assert.deepEqual(at('cerrado'), [[250, 'sand'], [1010, 'sand']]);
  assert.deepEqual(at('teste-plano'), [[40, 'sand'], [100, 'mud']]);
});
