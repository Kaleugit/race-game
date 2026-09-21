// RF-005 / CA-005: auto-righting after params.autoRightDelay upside down; chassis contact rests the car.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrack } from '../../src/track/track.js';
import { createCarPhysics } from '../../src/physics/car-physics.js';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { loadStages } from './load-stages.js';
import { runRace } from './harness.js';

const registry = await loadStages();
const mata = registry.getStage('mata-atlantica');
const plano = registry.getStage('teste-plano');
const idle = () => ({});

// Deepest CHASSIS_HITBOX point below the ground for a car state (positive = inside the ground).
function penetration(track, s, p = BASE_PARAMS) {
  const cosA = Math.cos(s.rot);
  const sinA = Math.sin(s.rot);
  const cy = s.y + p.CAR_HALF_HEIGHT + Math.max(0, cosA) * 0.5 * (1 - cosA);
  let depth = -Infinity;
  for (const [lx, ly] of p.CHASSIS_HITBOX) {
    const ay = ly + s.suspY;
    depth = Math.max(depth, track.heightAt(s.x + cosA * lx - sinA * ay) - (cy + sinA * lx + cosA * ay));
  }
  return depth;
}

test('BASE_PARAMS.autoRightDelay is 1.5s', () => {
  assert.equal(BASE_PARAMS.autoRightDelay, 1.5);
});

test('CA-005: upside down at rest on teste-plano rights itself in [1.3s, 1.7s], keeping x', () => {
  const r = runRace({ stage: plano, driver: idle, initialState: { rot: Math.PI }, maxTime: 4 });
  assert.equal(r.rightedTimes.length, 1, `righted at ${r.rightedTimes}`);
  const [tr] = r.rightedTimes;
  assert.ok(tr >= 1.3 && tr <= 1.7, `righted at ${tr}`);
  const after = r.samples.filter((s) => s.t >= tr);
  assert.ok(after.length > 60);
  for (const s of after) assert.ok(Math.cos(s.rot) > 0.9, `t ${s.t} rot ${s.rot}`);
  for (const s of r.samples) assert.ok(Math.abs(s.x) < 0.1, `x ${s.x}`);
  assert.equal(r.samples.find((s) => s.righted).speed, 0);
});

test('righted event fires exactly once on the frame the car is set back on its wheels', () => {
  const track = createTrack(plano);
  const car = createCarPhysics({ track, params: BASE_PARAMS });
  car.state.rot = Math.PI;
  const events = [];
  for (let i = 0; i < 180; i++) events.push(car.step(1 / 60, { locked: false }));
  const idx = events.map((e, i) => (e.righted ? i : -1)).filter((i) => i >= 0);
  assert.equal(idx.length, 1);
  assert.equal(car.state.upsideDownTime, 0);
  assert.equal(car.state.overturned, false);
});

test('upside down the car ignores throttle and turbo', () => {
  const opts = { stage: plano, initialState: { rot: Math.PI }, maxTime: 1.4 };
  const gas = runRace({ ...opts, driver: () => ({ up: true, space: true }) });
  const coast = runRace({ ...opts, driver: idle });
  assert.equal(gas.rightedTimes.length, 0);
  assert.deepEqual(gas.samples, coast.samples);
});

test('chassis contact rests the car: dropped on its roof it neither sinks nor jitters, and slides to a stop', () => {
  const track = createTrack(plano);
  const car = createCarPhysics({ track, params: BASE_PARAMS });
  Object.assign(car.state, { x: 20, y: 3, rot: Math.PI, speed: 12, airborne: true });
  const resting = [];
  let righted = false;
  for (let i = 0; i < 240 && !righted; i++) {
    const e = car.step(1 / 60, { locked: false });
    righted = e.righted;
    assert.ok(Number.isFinite(car.state.y + car.state.rot + car.state.speed));
    if (e.chassisContact && !righted) {
      assert.ok(penetration(track, car.state) < 0.01, `sank ${penetration(track, car.state)}`);
      resting.push({ ...car.state });
    }
  }
  assert.ok(righted, 'car must auto-right');
  assert.ok(resting.length > 30, `resting frames ${resting.length}`);
  const tail = resting.slice(-20);
  const ys = tail.map((s) => s.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 0.02, `y jitter ${Math.min(...ys)}..${Math.max(...ys)}`);
  assert.ok(tail.every((s) => Math.cos(s.rot) < -0.99), 'settled on the roof');
  assert.ok(Math.abs(tail.at(-1).speed) < 1e-9, `speed ${tail.at(-1).speed}`);
  for (let i = 1; i < resting.length; i++) {
    assert.ok(Math.abs(resting[i].speed) <= Math.abs(resting[i - 1].speed) + 1e-9, 'chassis friction slows the car');
  }
});

test('sequence: flipping during constant up on mata-atlantica never resets x and the race finishes', () => {
  // Front-flip: constant throttle, forward rotation whenever airborne.
  const r = runRace({ stage: mata, driver: (s) => ({ up: true, right: s.airborne }) });
  assert.equal(r.crashed, true, 'the driver must actually hit the chassis');
  assert.ok(r.rightedTimes.length >= 1, 'the driver must actually flip and be righted');
  assert.equal(r.finished, true);
  let prevX = 0;
  for (const s of r.samples) {
    assert.ok(s.x >= prevX - 0.5, `x jumped back at t ${s.t}: ${prevX} -> ${s.x}`);
    if (s.t > 2) assert.ok(s.x > 10, `x reset at t ${s.t}: ${s.x}`);
    prevX = s.x;
  }
  for (const tr of r.rightedTimes) {
    const i = r.samples.findIndex((s) => s.t === tr);
    assert.ok(Math.abs(r.samples[i].x - r.samples[i - 1].x) < 0.5, 'righting keeps x');
  }
});
