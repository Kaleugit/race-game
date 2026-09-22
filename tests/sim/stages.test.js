import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrack, SURFACE_TYPES } from '../../src/track/track.js';
import { createRegistry, validateStage } from '../../src/stages/registry.js';
import { loadStages } from './load-stages.js';
import mataLegacy from './fixtures/mata-atlantica-legacy.stage.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/mata-atlantica-heights.json', import.meta.url), 'utf8'),
);

function stub(overrides = {}) {
  return {
    id: 'stub',
    order: 1,
    track: { finishX: 100, noise: [], slopes: [], features: [] },
    surfaces: { default: 'dirt', zones: [] },
    ...overrides,
  };
}

const mods = (...stages) => Object.fromEntries(stages.map((s, i) => [`./s${i}.stage.js`, { default: s }]));

test('SURFACE_TYPES contract', () => {
  assert.deepEqual(SURFACE_TYPES, ['dirt', 'mud', 'sand']);
});

// The fixture is the pre-migration trackHeight (d399713). Since EP-005-01 redesigned the real stage, it is
// checked against the frozen pre-EP-005 stage data (the redesign keeps that opening verbatim, see below).
test('(a) legacy mata-atlantica heightAt matches pre-migration fixture within 1e-9', () => {
  const stage = mataLegacy;
  assert.doesNotThrow(() => validateStage(stage));
  assert.equal(fixture.points.length, 1881);
  const track = createTrack(stage);
  assert.equal(track.finishX, 620);
  for (const [x, expected] of fixture.points) {
    const diff = Math.abs(track.heightAt(x) - expected);
    assert.ok(diff <= 1e-9, `x=${x}: diff ${diff}`);
  }
});

test('EP-005-01: the redesigned mata-atlantica keeps the prototype opening (x < 885) verbatim', async () => {
  const track = createTrack((await loadStages()).getStage('mata-atlantica'));
  const opening = fixture.points.filter(([x]) => x < 885);
  assert.ok(opening.length > 1800);
  for (const [x, expected] of opening) {
    const diff = Math.abs(track.heightAt(x) - expected);
    assert.ok(diff <= 1e-9, `x=${x}: diff ${diff}`);
  }
});

test('(a) mata-atlantica is the default stage and validates', async () => {
  const registry = await loadStages();
  assert.equal(registry.getDefaultStage().id, 'mata-atlantica');
});

test('(b) validateStage rejects unknown feature.type', () => {
  const s = stub();
  s.track.features = [{ x: 10, type: 'x', w: 2, h: 1 }];
  assert.throws(() => validateStage(s), /feature\.type/);
});

test('(b) validateStage rejects unknown surface.type', () => {
  assert.throws(
    () => validateStage(stub({ surfaces: { default: 'dirt', zones: [{ from: 0, to: 10, type: 'x' }] } })),
    /surface\.type/,
  );
  assert.throws(() => validateStage(stub({ surfaces: { default: 'x', zones: [] } })), /surface\.type/);
});

test('(b) validateStage rejects missing finishX', () => {
  const s = stub();
  delete s.track.finishX;
  assert.throws(() => validateStage(s), /finishX/);
});

test('(b) createRegistry rejects duplicate id', () => {
  assert.throws(() => createRegistry(mods(stub({ id: 'a' }), stub({ id: 'a' }))), /duplicate/);
});

test('(c) listStages sorts by order and omits hidden', () => {
  const registry = createRegistry(mods(
    stub({ id: 'c', order: 3 }),
    stub({ id: 'h', order: 0, hidden: true }),
    stub({ id: 'a', order: 1 }),
    stub({ id: 'b', order: 2 }),
  ));
  assert.deepEqual(registry.listStages().map((s) => s.id), ['a', 'b', 'c']);
  assert.equal(registry.getDefaultStage().id, 'a');
  assert.equal(registry.getStage('h').id, 'h', 'hidden stage still reachable by id');
});

test('(d) surfaceAt returns default outside zones and zone type inside [from, to)', () => {
  const track = createTrack(stub({
    surfaces: { default: 'dirt', zones: [{ from: 10, to: 20, type: 'mud' }, { from: 30, to: 40, type: 'sand' }] },
  }));
  assert.equal(track.surfaceAt(0), 'dirt');
  assert.equal(track.surfaceAt(10), 'mud');
  assert.equal(track.surfaceAt(15), 'mud');
  assert.equal(track.surfaceAt(20), 'dirt');
  assert.equal(track.surfaceAt(35), 'sand');
  assert.equal(track.surfaceAt(50), 'dirt');
});

test('slopeAt = (heightAt(x+1) - heightAt(x-1)) / 2', async () => {
  const track = createTrack((await loadStages()).getStage('mata-atlantica'));
  for (const x of [0, 95, 240.5, 610]) {
    assert.equal(track.slopeAt(x), (track.heightAt(x + 1) - track.heightAt(x - 1)) / 2);
  }
});
