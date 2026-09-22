import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createTrack } from '../../src/track/track.js';
import { createCarPhysics } from '../../src/physics/car-physics.js';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { loadStages } from './load-stages.js';
import { runRace } from './harness.js';
import mataLegacy from './fixtures/mata-atlantica-legacy.stage.js';

const registry = await loadStages();
const mata = registry.getStage('mata-atlantica');
const plano = registry.getStage('teste-plano');

const throttle = () => ({ up: true });
const turbo = () => ({ up: true, space: true });
const mixed = (s, t) => {
  const ph = t % 12;
  return { up: ph < 9, space: ph >= 3 && ph < 5, down: ph >= 10, left: ph >= 6 && ph < 6.1, right: ph >= 7 && ph < 7.1 };
};

function steadySpeeds(result, lastN = 60) {
  return result.samples.slice(-lastN).map((s) => s.speed);
}

test('src/physics is pure (no DOM, three, randomness or clocks)', () => {
  const dir = new URL('../../src/physics/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(src, /document|window|from 'three'|Math\.random|performance\.|Date\./, f);
  }
});

test('(a) constant up on teste-plano stabilizes at maxSpeedNormal ±2%', () => {
  const r = runRace({ stage: plano, driver: throttle });
  assert.equal(r.finished, true);
  for (const v of steadySpeeds(r)) {
    assert.ok(Math.abs(v - BASE_PARAMS.maxSpeedNormal) <= 0.02 * BASE_PARAMS.maxSpeedNormal, `speed ${v}`);
  }
});

test('(b) up+space with infinite turbo stabilizes at maxSpeedTurbo ±2%', () => {
  const r = runRace({ stage: plano, driver: turbo, initialState: { infiniteTurbo: true } });
  assert.equal(r.finished, true);
  for (const v of steadySpeeds(r)) {
    assert.ok(Math.abs(v - BASE_PARAMS.maxSpeedTurbo) <= 0.02 * BASE_PARAMS.maxSpeedTurbo, `speed ${v}`);
  }
});

test('(c) constant up finishes mata-atlantica', () => {
  const r = runRace({ stage: mata, driver: throttle });
  assert.equal(r.crashed, false);
  assert.equal(r.finished, true);
  assert.ok(r.finishTime > 0 && r.finishTime < 180);
});

test('(d) two instances in the same loop do not interfere', () => {
  const track = createTrack(mata);
  const dt = 1 / 60;
  const run = (cars) => {
    const traces = cars.map(() => []);
    for (let i = 0; i < 1200; i++) {
      const t = i * dt;
      cars.forEach(({ car, driver }, k) => {
        car.step(dt, { locked: false, ...driver(car.state, t) });
        traces[k].push({ ...car.state });
      });
    }
    return traces;
  };
  const mk = (driver) => ({ car: createCarPhysics({ track, params: BASE_PARAMS }), driver });
  const [a, b] = run([mk(throttle), mk(mixed)]);
  const [aAlone] = run([mk(throttle)]);
  const [bAlone] = run([mk(mixed)]);
  assert.deepEqual(a, aAlone);
  assert.deepEqual(b, bAlone);
  assert.notDeepEqual(a.at(-1), b.at(-1));
});

test('reset() restores the initial state and keeps dev toggles', () => {
  const car = createCarPhysics({ track: createTrack(mata), params: BASE_PARAMS });
  const fresh = { ...car.state };
  car.state.infiniteTurbo = true;
  for (let i = 0; i < 300; i++) car.step(1 / 60, { up: true, space: true, locked: false });
  car.reset();
  assert.deepEqual(car.state, { ...fresh, infiniteTurbo: true });
});

test('locked input ignores throttle/turbo (countdown)', () => {
  const car = createCarPhysics({ track: createTrack(plano), params: BASE_PARAMS });
  for (let i = 0; i < 120; i++) car.step(1 / 60, { up: true, space: true, locked: true });
  assert.equal(car.state.turboActive, false);
  assert.equal(car.state.fuel, 1);
  assert.ok(Math.abs(car.state.speed) < 0.5, `speed ${car.state.speed}`);
});

// Golden values recorded from the ORIGINAL physics (src/main.js @ 54003dd: updateTurbo, updateSpeed,
// updatePhysics, checkChassisHitbox, updateRotation, updateSuspension, text-extracted and run in Node
// with three.js objects stubbed), dt = 1/60, mata-atlantica. The extraction was bit-exact frame by frame.
// They run on the frozen pre-EP-005 Mata Atlântica (fixtures/mata-atlantica-legacy.stage.js), the track
// they were recorded on, so they keep guarding physics equivalence after the real stage was redesigned.
const GOLDEN = {
  throttle: {
    frames: 1416, finishTime: 23.59999999999994, maxSpeed: 29.50364324808708, sum: 459016.16660206637,
    checkpoints: [
      [300, 102.02374522626366, 27.895344911742843, 2.430945299176958, 0.19136585583504997, -0.011793313162850138],
      [600, 240.60240545814835, 27.721909474576297, 30.00070663870013, 0.7030998361916888, -0.004948894157231073],
      [900, 380.86888272882925, 27.837573607146293, 2.85690638227489, 0.24360267438049177, -0.00386151213546169],
      [1200, 519.9963227835652, 27.881501162511494, 0.9329232068929916, 0.013958617640171879, -0.022232086298043872],
      [1416, 620.1840880233767, 27.939546050032686, -0.5654099416722582, 0.009168051408139817, 0.01567647769822766],
    ],
  },
  turbo: {
    frames: 905, finishTime: 15.083333333333663, maxSpeed: 43.759440197501874, sum: 313274.6163979489,
    initialState: { infiniteTurbo: true },
    checkpoints: [
      [300, 181.99773137820824, 43.450132016558314, 4.799210435476618, 0.17130101932726907, -0.0023510176030964417],
      [600, 399.4390546720165, 43.5415857926877, 1.8219535745746689, 0.7040831920404848, -2.402581901226494e-14],
      [900, 616.9896517137414, 43.58885365245044, -0.5920135067985299, 0.007592940403434731, -0.07238111500216751],
      [905, 620.6138027963091, 43.75085314520988, -0.5599020858459871, 0.009313578087567203, -0.03757234192889885],
    ],
  },
  mixed: {
    frames: 1634, finishTime: 27.233333333333068, maxSpeed: 43.75536310786786, sum: 588944.1456733836,
    checkpoints: [
      [300, 128.72278301042132, 43.39156918866539, 1.6888533026065913, 0.16730009228158138, -0.00028534772052853834],
      [600, 270.159115567571, 24.32159579038722, 29.02154279236114, 0.702055950157071, -0.0000012157874418283742],
      [900, 343.11727664393425, 27.80508132910184, 1.5967910267460887, 0.1471475112421635, -0.007180163073959792],
      [1200, 513.6497652097923, 27.78851095414198, 0.8662246171679104, 0.00016298485525528288, -0.03328362809910609],
      [1500, 576.3202025060908, 7.472000895071416, 1.089883976597791, -0.020611189558079366, 0.014738518817245678],
      [1634, 620.0939511365009, 33.54039773664698, -0.5664890321306622, 0.009001800935923076, 0.013450497338571479],
    ],
  },
};
const DRIVERS = { throttle, turbo, mixed };

for (const [name, g] of Object.entries(GOLDEN)) {
  test(`golden: '${name}' on the legacy mata-atlantica matches the pre-extraction physics`, () => {
    const r = runRace({ stage: mataLegacy, driver: DRIVERS[name], initialState: g.initialState });
    const close = (a, b, label) => assert.ok(Math.abs(a - b) <= 1e-9, `${label}: ${a} vs ${b}`);
    assert.equal(r.crashed, false);
    assert.equal(r.finished, true);
    assert.equal(r.samples.length, g.frames);
    close(r.finishTime, g.finishTime, 'finishTime');
    close(r.maxSpeed, g.maxSpeed, 'maxSpeed');
    let sum = 0;
    for (const s of r.samples) sum += s.x + s.speed + s.y + s.rot + s.suspY;
    assert.ok(Math.abs(sum - g.sum) <= 1e-9 * g.sum, `sum ${sum} vs ${g.sum}`);
    for (const [frame, x, speed, y, rot, suspY] of g.checkpoints) {
      const s = r.samples[frame - 1];
      close(s.x, x, `f${frame}.x`);
      close(s.speed, speed, `f${frame}.speed`);
      close(s.y, y, `f${frame}.y`);
      close(s.rot, rot, `f${frame}.rot`);
      close(s.suspY, suspY, `f${frame}.suspY`);
    }
  });
}
