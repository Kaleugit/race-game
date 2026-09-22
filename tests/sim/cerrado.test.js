// EP-005-02: the Cerrado stage (RF-011). Registry order/visuals, hand-placed sand zones, CA-008 on the
// real stage (Off-road beats Estrada on every sand stretch; every part swap moves time or top speed
// by >= 3%) and "a little harder than Mata Atlântica" (epic DA-003: bot median / reference time is
// lower on Cerrado). CA-004 and CA-009 for Cerrado come from the generic bot/stage-duration tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrack } from '../../src/track/track.js';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { TIRES, GEARBOXES, DEFAULT_PARTS, resolveCarParams } from '../../src/parts/presets.js';
import { createBotDriver } from '../../src/bot/bot-driver.js';
import { resolveBotParams } from '../../src/bot/bot-preset.js';
import { loadStages } from './load-stages.js';
import { runRace } from './harness.js';
import { createReferenceDriver } from './reference-driver.js';

const DT = 1 / 60;
const registry = await loadStages();
const cerrado = registry.getStage('cerrado');
const mata = registry.getStage('mata-atlantica');

const up = () => ({ up: true });
const params = (tire, gearbox) => resolveCarParams(BASE_PARAMS, { tire, gearbox });
const race = (p) => runRace({ stage: cerrado, params: p, driver: up });
const relDiff = (a, b) => Math.abs(a - b) / b;
const sandZones = () => cerrado.surfaces.zones.filter((z) => z.type === 'sand');

// Seconds spent crossing [from, to).
function zoneTime(r, { from, to }) {
  const entry = r.samples.find((s) => s.x >= from);
  const exit = r.samples.find((s) => s.x >= to);
  return exit.t - entry.t;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2;
};

// Bot median over seeds 1..10 divided by the reference-driver time (epic DA-003).
function botRatio(stage) {
  const track = createTrack(stage);
  const ref = runRace({ stage, params: resolveCarParams(BASE_PARAMS, DEFAULT_PARTS), driver: createReferenceDriver(track) });
  assert.equal(ref.finished, true, `${stage.id}: reference must finish`);
  const times = Array.from({ length: 10 }, (_, i) => {
    const bot = createBotDriver({ track, difficulty: stage.bot.difficulty, seed: i + 1 });
    const r = runRace({ stage, params: resolveBotParams(stage), driver: (s) => bot.decide(s, DT) });
    assert.equal(r.finished, true, `${stage.id}: seed ${i + 1} must finish`);
    return r.finishTime;
  });
  return median(times) / ref.finishTime;
}

test('Cerrado is listed as the 2nd stage, after Mata Atlântica, with its background and red-earth palette', () => {
  const ids = registry.listStages().map((s) => s.id);
  assert.deepEqual(ids.slice(0, 2), ['mata-atlantica', 'cerrado']);
  assert.equal(cerrado.name, 'Cerrado');
  assert.equal(cerrado.order, 2);
  assert.notEqual(cerrado.hidden, true);
  assert.equal(cerrado.visuals.background, '/img/cerrado.jpg');
  assert.equal(cerrado.visuals.mudLayer, false);
  assert.equal(typeof cerrado.visuals.palette.ground, 'number');
  assert.equal(typeof cerrado.visuals.palette.zones.sand, 'number');
  assert.notEqual(cerrado.visuals.palette.ground, mata.visuals.palette.ground);
});

test('Cerrado has hand-placed physical sand zones and a relief distinct from Mata Atlântica', () => {
  const zones = sandZones();
  assert.ok(zones.length >= 2, 'at least two sand stretches');
  const track = createTrack(cerrado);
  for (const z of zones) {
    assert.ok(z.to - z.from >= 50, `sand [${z.from}, ${z.to}) long enough to matter`);
    assert.equal(track.surfaceAt((z.from + z.to) / 2), 'sand');
  }
  assert.equal(track.surfaceAt(0), 'dirt');
  const mataTrack = createTrack(mata);
  let diff = 0;
  let n = 0;
  for (let x = 0; x < Math.min(cerrado.track.finishX, mata.track.finishX); x += 5, n++) {
    diff += Math.abs(track.heightAt(x) - mataTrack.heightAt(x));
  }
  assert.ok(diff / n > 1, `mean height difference ${(diff / n).toFixed(2)} m`);
});

test('CA-008 (Cerrado): with constant up, Off-road crosses every sand stretch faster than Estrada', () => {
  const road = race(params('estrada', 'padrao'));
  const off = race(params('offroad', 'padrao'));
  assert.equal(road.finished, true);
  assert.equal(off.finished, true);
  for (const z of sandZones()) {
    const tOff = zoneTime(off, z);
    const tRoad = zoneTime(road, z);
    assert.ok(tOff < tRoad, `sand [${z.from}, ${z.to}): offroad ${tOff.toFixed(2)}s vs estrada ${tRoad.toFixed(2)}s`);
    assert.ok(relDiff(tOff, tRoad) >= 0.03, `sand [${z.from}, ${z.to}): ${(relDiff(tOff, tRoad) * 100).toFixed(2)}%`);
  }
});

test('CA-008 (Cerrado): every tire and gearbox swap changes race time or max speed by >= 3% (constant up)', () => {
  const ref = race(params('misto', 'padrao'));
  assert.equal(ref.finished, true);
  const swaps = [
    ...Object.keys(TIRES).filter((t) => t !== 'misto').map((t) => [t, 'padrao']),
    ...Object.keys(GEARBOXES).filter((g) => g !== 'padrao').map((g) => ['misto', g]),
  ];
  for (const [tire, gearbox] of swaps) {
    const r = race(params(tire, gearbox));
    assert.equal(r.finished, true, `${tire}/${gearbox}`);
    const d = Math.max(relDiff(r.finishTime, ref.finishTime), relDiff(r.maxSpeed, ref.maxSpeed));
    assert.ok(d >= 0.03, `${tire}/${gearbox}: ${(d * 100).toFixed(2)}%`);
  }
});

test('Cerrado bot is a little harder than Mata Atlântica: higher difficulty, lower bot/reference ratio (still > 1)', () => {
  assert.ok(cerrado.bot.difficulty > mata.bot.difficulty);
  const rc = botRatio(cerrado);
  const rm = botRatio(mata);
  assert.ok(rc < rm, `cerrado ratio ${rc.toFixed(4)} vs mata ${rm.toFixed(4)}`);
  assert.ok(rc > 1, `cerrado ratio ${rc.toFixed(4)}: bot must stay slower than the reference`);
});
