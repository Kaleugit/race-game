// CA-009: a race on every listed stage takes 30–45 s for the skilled-player reference driver
// ("acelerar + turbo, correções mínimas") with the default parts. Generic over listStages()
// (epic EP-005 DA-001): a new stage is covered without a new test; hidden stages are excluded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrack } from '../../src/track/track.js';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { DEFAULT_PARTS, resolveCarParams } from '../../src/parts/presets.js';
import { loadStages } from './load-stages.js';
import { runRace } from './harness.js';
import { createReferenceDriver } from './reference-driver.js';

const MIN_S = 30;
const MAX_S = 45;
const registry = await loadStages();
const params = resolveCarParams(BASE_PARAMS, DEFAULT_PARTS);

test('listStages() is not empty and excludes hidden stages', () => {
  const stages = registry.listStages();
  assert.ok(stages.length >= 1);
  for (const s of stages) assert.notEqual(s.hidden, true, s.id);
});

for (const stage of registry.listStages()) {
  test(`CA-009 (${stage.id}): reference driver with DEFAULT_PARTS finishes in [${MIN_S}s, ${MAX_S}s]`, () => {
    const r = runRace({ stage, params, driver: createReferenceDriver(createTrack(stage)) });
    assert.equal(r.finished, true, `did not finish (x ${r.samples.at(-1).x.toFixed(1)} of ${stage.track.finishX})`);
    assert.ok(r.finishTime >= MIN_S && r.finishTime <= MAX_S, `${stage.id}: ${r.finishTime.toFixed(2)}s`);
  });
}
