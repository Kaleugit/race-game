// RF-004 bot AI: CA-004 (every listed stage, 10 seeds), CA-005 for the bot, reproducibility (CDC-106),
// stall recovery on the steep climb with normal inputs, and the bot part preset (RF-007 / CA-007).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createTrack } from '../../src/track/track.js';
import { createCarPhysics } from '../../src/physics/car-physics.js';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { resolveCarParams } from '../../src/parts/presets.js';
import { createPrng } from '../../src/bot/prng.js';
import { createBotDriver, runBotToFinish } from '../../src/bot/bot-driver.js';
import { BOT_DEFAULT_PARTS, resolveBotParams } from '../../src/bot/bot-preset.js';
import { loadStages } from './load-stages.js';
import { runRace } from './harness.js';
import { createReferenceDriver } from './reference-driver.js';

const DT = 1 / 60;
const registry = await loadStages();
const mata = registry.getStage('mata-atlantica');
const plano = registry.getStage('teste-plano');

function botRace(stage, seed, extra = {}) {
  const track = createTrack(stage);
  const bot = createBotDriver({ track, difficulty: stage.bot.difficulty, seed });
  return runRace({ stage, params: resolveBotParams(stage), driver: (s) => bot.decide(s, DT), ...extra });
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2;
};

test('createPrng: mulberry32 in [0, 1), same seed same sequence, different seeds differ', () => {
  const a = createPrng(42);
  const b = createPrng(42);
  const c = createPrng(43);
  const sa = Array.from({ length: 1000 }, a);
  assert.deepEqual(Array.from({ length: 1000 }, b), sa);
  assert.notDeepEqual(Array.from({ length: 1000 }, c), sa);
  for (const v of sa) assert.ok(v >= 0 && v < 1, `${v}`);
  // Known first output of mulberry32(1).
  assert.equal(createPrng(1)(), 0.6270739405881613);
});

test('no Math.random in src/bot', () => {
  const dir = new URL('../../src/bot/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    assert.ok(!readFileSync(new URL(f, dir), 'utf8').includes('Math.random'), f);
  }
});

test('decide returns the player input shape with locked false', () => {
  const track = createTrack(mata);
  const car = createCarPhysics({ track, params: resolveBotParams(mata) });
  const bot = createBotDriver({ track, difficulty: 0.5, seed: 1 });
  const input = bot.decide(car.state, DT);
  assert.deepEqual(Object.keys(input).sort(), ['down', 'left', 'locked', 'right', 'space', 'up']);
  assert.equal(input.locked, false);
  assert.equal(input.up, true);
});

// CA-004 per stage (epic EP-005 DA-001): every stage of listStages() is covered without a new test.
for (const stage of registry.listStages()) test(`CA-004 (${stage.id}): seeds 1..10 all finish within 180s, within ±15% of the median, slower than the reference driver`, () => {
  const ref = runRace({ stage, driver: createReferenceDriver(createTrack(stage)) });
  assert.equal(ref.finished, true, 'reference driver must finish');
  const times = [];
  for (let seed = 1; seed <= 10; seed++) {
    const r = botRace(stage, seed);
    assert.equal(r.finished, true, `seed ${seed} did not finish (x ${r.samples.at(-1).x})`);
    assert.ok(r.finishTime <= 180, `seed ${seed}: ${r.finishTime}`);
    times.push(r.finishTime);
  }
  const med = median(times);
  for (const [i, t] of times.entries()) {
    assert.ok(Math.abs(t - med) <= 0.15 * med, `seed ${i + 1}: ${t.toFixed(2)}s vs median ${med.toFixed(2)}s`);
    assert.ok(t > ref.finishTime, `seed ${i + 1}: ${t.toFixed(2)}s beat the reference ${ref.finishTime.toFixed(2)}s`);
  }
  assert.ok(med > ref.finishTime, `median ${med} vs reference ${ref.finishTime}`);
  assert.ok(new Set(times.map((t) => t.toFixed(3))).size > 1, 'seeds must produce different races');
});

// EP-008-05: human-rate input policies (DEFAULT_PARTS == BASE_PARAMS) beat the bot median by a margin:
// holding ArrowUp + Space with no air corrections, and tapping Space 0.1 s on / 0.1 s off with the
// reference air corrections.
const HUMAN_MARGIN = 0.03;
for (const stage of registry.listStages()) test(`CA-004 (${stage.id}): human-rate policies (hold, 0.1 s taps) beat the bot median by >= ${HUMAN_MARGIN * 100}%`, () => {
  const ref = createReferenceDriver(createTrack(stage));
  const policies = {
    hold: () => ({ up: true, space: true }),
    tap: (s, t) => ({ ...ref(s, t), space: Math.floor(t / 0.1 + 1e-9) % 2 === 0 }),
  };
  const med = median(Array.from({ length: 10 }, (_, i) => botRace(stage, i + 1).finishTime));
  for (const [name, driver] of Object.entries(policies)) {
    const r = runRace({ stage, driver });
    assert.equal(r.finished, true, `${name} must finish`);
    assert.ok(r.finishTime <= med * (1 - HUMAN_MARGIN), `${name}: ${r.finishTime.toFixed(2)}s vs bot median ${med.toFixed(2)}s`);
  }
});

test('CDC-106: same seed -> same finish time and same run', () => {
  const a = botRace(mata, 7);
  const b = botRace(mata, 7);
  assert.equal(a.finishTime, b.finishTime);
  assert.deepEqual(a.samples, b.samples);
});

test('difficulty lowers the bot time (median over seeds 1..10)', () => {
  const med = (difficulty) => median(Array.from({ length: 10 }, (_, i) => {
    const track = createTrack(mata);
    const bot = createBotDriver({ track, difficulty, seed: i + 1 });
    return runRace({ stage: mata, params: resolveBotParams(mata), driver: (s) => bot.decide(s, DT) }).finishTime;
  }));
  const easy = med(0);
  const hard = med(1);
  assert.ok(hard < easy, `hard ${hard} vs easy ${easy}`);
});

test('CA-005 (bot): bot car upside down at rest rights itself in [1.3s, 1.7s]', () => {
  const r = botRace(plano, 1, { initialState: { rot: Math.PI }, maxTime: 4 });
  assert.ok(r.rightedTimes.length >= 1, 'bot car must auto-right');
  const [tr] = r.rightedTimes;
  assert.ok(tr >= 1.3 && tr <= 1.7, `righted at ${tr}`);
  for (const s of r.samples.filter((x) => x.t < tr)) assert.ok(Math.abs(s.x) < 0.1, `moved while upside down: ${s.x}`);
  assert.ok(r.samples.at(-1).x > 1, 'bot drives on after righting');
});

test('stall on the steep Mata Atlântica climb (righted, speed 0, empty tank): constant up stalls, the bot recovers and finishes', () => {
  const track = createTrack(mata);
  const x = 213;
  const initialState = {
    x,
    y: (track.heightAt(x + 1) + track.heightAt(x - 1)) / 2 + 0.5,
    rot: Math.atan(track.slopeAt(x)) + Math.PI,
    fuel: 0,
    prevTrackH: track.heightAt(x),
  };
  const up = runRace({ stage: mata, driver: () => ({ up: true }), initialState, maxTime: 60 });
  assert.equal(up.finished, false, 'scenario must stall a constant-up driver');
  assert.equal(up.rightedTimes.length, 1);
  for (let seed = 1; seed <= 5; seed++) {
    const r = botRace(mata, seed, { initialState });
    assert.ok(r.rightedTimes.length >= 1, `seed ${seed}: not righted`);
    assert.equal(r.finished, true, `seed ${seed}: stuck at x ${r.samples.at(-1).x}`);
  }
});

test('runBotToFinish: advances only the bot to finishX; equals the full-race time; null past maxTime', () => {
  const track = createTrack(mata);
  const params = resolveBotParams(mata);
  const full = botRace(mata, 3);
  const car = createCarPhysics({ track, params });
  const driver = createBotDriver({ track, difficulty: mata.bot.difficulty, seed: 3 });
  // First 5s "in the race loop", then the rest simulated at once.
  let t = 0;
  for (let i = 0; i < 300; i++) {
    car.step(DT, driver.decide(car.state, DT));
    t += DT;
  }
  const finishTime = runBotToFinish({ car, driver, track, startTime: t });
  assert.ok(Math.abs(finishTime - full.finishTime) < 1e-9, `${finishTime} vs ${full.finishTime}`);
  assert.ok(car.state.x >= track.finishX);

  const slow = createCarPhysics({ track, params });
  const d2 = createBotDriver({ track, difficulty: 0.5, seed: 3 });
  assert.equal(runBotToFinish({ car: slow, driver: d2, track, maxTime: 2 }), null);
});

test('resolveBotParams: stage data only, never the garage choice', () => {
  assert.deepEqual(BOT_DEFAULT_PARTS, { tire: 'misto', gearbox: 'padrao', engine: 'e20', chassis: 'medio', tank: 'medio' });
  const noParts = { ...mata, bot: { difficulty: 0.5 } };
  const expectedDefault = resolveCarParams(BASE_PARAMS, BOT_DEFAULT_PARTS);
  assert.deepEqual(resolveBotParams(noParts), expectedDefault);
  assert.equal(resolveBotParams.length, 1, 'takes only the stage');

  const withParts = { ...mata, bot: { difficulty: 0.5, parts: { tire: 'offroad', gearbox: 'curta' } } };
  const expectedParts = resolveCarParams(BASE_PARAMS, { tire: 'offroad', gearbox: 'curta' });
  // Whatever the player picked in the garage, the bot params do not change.
  for (const garage of [{ tire: 'estrada', gearbox: 'longa' }, { tire: 'misto', gearbox: 'padrao' }, { tire: 'offroad', gearbox: 'curta' }]) {
    resolveCarParams(BASE_PARAMS, garage); // player's params, resolved independently
    assert.deepEqual(resolveBotParams(noParts), expectedDefault);
    assert.deepEqual(resolveBotParams(withParts), expectedParts);
  }
  assert.notDeepEqual(expectedParts, expectedDefault);
});
