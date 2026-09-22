// RF-012 / CA-010: engines, chassis and turbo tanks. Default parts (2.0 + Médio + Médio) keep the
// current physics identical; every swap changes race time, top speed or turbo time by >= 3%; no part
// is strictly dominant (CDC-102) in any context of the other parts and no build beats every other;
// the engine preset slightly changes the engine sound model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_PARAMS } from '../../src/physics/params.js';
import { SURFACE_TYPES, createTrack } from '../../src/track/track.js';
import { createCarPhysics } from '../../src/physics/car-physics.js';
import {
  TIRES, GEARBOXES, ENGINES, CHASSIS, TANKS, DEFAULT_PARTS, resolveCarParams,
} from '../../src/parts/presets.js';
import { BOT_DEFAULT_PARTS, resolveBotParams } from '../../src/bot/bot-preset.js';
import { ENGINE_DEFAULTS, createEngineModel } from '../../src/audio/engine-model.js';
import { loadStages } from './load-stages.js';
import { runRace } from './harness.js';
import { createReferenceDriver } from './reference-driver.js';
import areia from './fixtures/areia.stage.js';

const DT = 1 / 60;
const KINDS = { tire: TIRES, gearbox: GEARBOXES, engine: ENGINES, chassis: CHASSIS, tank: TANKS };
const NEW_KINDS = { engine: ENGINES, chassis: CHASSIS, tank: TANKS };
const up = () => ({ up: true });
const withParts = (over = {}) => resolveCarParams(BASE_PARAMS, { ...DEFAULT_PARTS, ...over });
const relDiff = (a, b) => Math.abs(a - b) / Math.abs(b);
const registry = await loadStages();

// Near-flat 300 m track entirely on one surface (derived from the sand fixture, as in parts.test.js).
const onSurface = (surface) => ({ ...areia, id: `flat-${surface}`, surfaces: { default: surface, zones: [] } });
const TERRAINS = Object.fromEntries(SURFACE_TYPES.map((s) => [s, onSurface(s)]));
const DIRT_TRACK = createTrack(TERRAINS.dirt);

// Seconds of turbo from a full tank holding Up + Space (until the tank runs empty).
function turboTime(params) {
  const car = createCarPhysics({ track: DIRT_TRACK, params });
  let t = 0;
  while (t < 30) {
    car.step(DT, { up: true, space: true, locked: false });
    if (!car.state.turboActive) break;
    t += DT;
  }
  return t;
}

// Seconds to refill an empty tank with the turbo off.
function refillTime(params) {
  const car = createCarPhysics({ track: DIRT_TRACK, params });
  car.state.fuel = 0;
  let t = 0;
  while (car.state.fuel < 1 && t < 60) {
    car.step(DT, { up: true, locked: false });
    t += DT;
  }
  return t;
}

// Landing stability: the car falls 18 m at 15 m/s (>= BOUNCE_MIN_AIRTIME in the air) with Up held;
// returns the peak rebound height above the ground after the first landing (lower = more stable).
function reboundHeight(params) {
  const car = createCarPhysics({ track: DIRT_TRACK, params });
  Object.assign(car.state, { y: DIRT_TRACK.heightAt(0) + 18, airborne: true, speed: 15 });
  let t = 0;
  let landed = false;
  let peak = 0;
  while (t < 8) {
    const ev = car.step(DT, { up: true, locked: false });
    t += DT;
    if (ev.landed) landed = true;
    if (landed && car.state.airborne) peak = Math.max(peak, car.state.y - DIRT_TRACK.heightAt(car.state.x));
  }
  return peak;
}

// Angular velocity after holding Left for 0.3 s in the air (air torque response).
function airSpin(params) {
  const car = createCarPhysics({ track: DIRT_TRACK, params });
  Object.assign(car.state, { y: DIRT_TRACK.heightAt(0) + 30, airborne: true, speed: 15 });
  for (let i = 0; i < 18; i++) car.step(DT, { left: true, locked: false });
  return car.state.angVel;
}

// CDC-102 scorecard (higher is better): per terrain race time, top speed and sprint (time to 40 m,
// acceleration) with constant Up, plus turbo time per full tank and landing stability (rebound
// rounded to the millimetre: sub-mm differences come from the landing x, not from the parts).
const SPRINT_X = 40;
function scorecard(params) {
  const out = {};
  for (const [surface, stage] of Object.entries(TERRAINS)) {
    const r = runRace({ stage, params, driver: up });
    assert.equal(r.finished, true, `must finish on ${surface}`);
    out[`${surface}.time`] = -r.finishTime;
    out[`${surface}.maxSpeed`] = r.maxSpeed;
    out[`${surface}.sprint`] = -r.samples.find((s) => s.x >= SPRINT_X).t;
  }
  out.turboTime = turboTime(params);
  out.stability = -Math.round(reboundHeight(params) * 1000) / 1000;
  return out;
}
const beatsSomewhere = (a, b) => Object.keys(a).some((m) => a[m] > b[m]);

const COMBOS = [];
for (const tire of Object.keys(TIRES)) for (const gearbox of Object.keys(GEARBOXES)) {
  for (const engine of Object.keys(ENGINES)) for (const chassis of Object.keys(CHASSIS)) {
    for (const tank of Object.keys(TANKS)) COMBOS.push({ tire, gearbox, engine, chassis, tank });
  }
}
const comboKey = (c) => `${c.tire}/${c.gearbox}/${c.engine}/${c.chassis}/${c.tank}`;
let cardsCache = null;
function allCards() {
  cardsCache ??= new Map(COMBOS.map((c) => [comboKey(c), scorecard(resolveCarParams(BASE_PARAMS, c))]));
  return cardsCache;
}

test('default parts are the original car: resolveCarParams(BASE_PARAMS, DEFAULT_PARTS) deep-equals BASE_PARAMS', () => {
  assert.deepEqual(DEFAULT_PARTS, { tire: 'misto', gearbox: 'padrao', engine: 'e20', chassis: 'medio', tank: 'medio' });
  assert.deepEqual(resolveCarParams(BASE_PARAMS, DEFAULT_PARTS), { ...BASE_PARAMS });
  // A { tire, gearbox } selection (pre-RF-012 garage) gets the default engine/chassis/tank.
  assert.deepEqual(resolveCarParams(BASE_PARAMS, { tire: 'misto', gearbox: 'padrao' }), { ...BASE_PARAMS });
  assert.equal(BASE_PARAMS.mass, 1);
  assert.equal(BASE_PARAMS.turboCapacity, 1);
  const e = ENGINES[DEFAULT_PARTS.engine];
  assert.deepEqual([e.accelMult, e.topSpeedMult, e.mass, e.turboBurnMult, e.timbre], [1, 1, 1, 1, 1]);
  assert.deepEqual(e.sound, {});
  assert.equal(CHASSIS[DEFAULT_PARTS.chassis].mass, 1);
  assert.deepEqual([TANKS[DEFAULT_PARTS.tank].capacity, TANKS[DEFAULT_PARTS.tank].mass], [1, 1]);
});

test('bot is unaffected: BOT_DEFAULT_PARTS are the defaults and resolve to BASE_PARAMS', () => {
  assert.deepEqual(BOT_DEFAULT_PARTS, DEFAULT_PARTS);
  for (const stage of registry.listStages()) assert.deepEqual(resolveBotParams(stage), { ...BASE_PARAMS }, stage.id);
});

test('default parts keep the real stages bit-identical (reference driver, every sample)', () => {
  for (const stage of registry.listStages()) {
    const track = createTrack(stage);
    const a = runRace({ stage, params: withParts(), driver: createReferenceDriver(track) });
    const b = runRace({ stage, params: BASE_PARAMS, driver: createReferenceDriver(track) });
    assert.equal(a.finished, true, stage.id);
    assert.deepEqual(a.samples, b.samples, stage.id);
  }
});

test('three PT-BR labelled parts per kind; resolved values; unknown ids throw', () => {
  assert.deepEqual(Object.keys(ENGINES), ['e16', 'e20', 'e24']);
  assert.deepEqual(Object.keys(CHASSIS), ['leve', 'medio', 'pesado']);
  assert.deepEqual(Object.keys(TANKS), ['pequeno', 'medio', 'grande']);
  assert.deepEqual(Object.values(ENGINES).map((x) => x.label), ['1.6', '2.0', '2.4']);
  assert.deepEqual(Object.values(CHASSIS).map((x) => x.label), ['Leve', 'Médio', 'Pesado']);
  assert.deepEqual(Object.values(TANKS).map((x) => x.label), ['Pequeno', 'Médio', 'Grande']);
  for (const tab of Object.values(NEW_KINDS)) {
    assert.ok(Object.isFrozen(tab));
    for (const part of Object.values(tab)) assert.ok(Object.isFrozen(part));
  }
  // HP grows with displacement; so do mass and turbo burn (the trade-off).
  const [e16, e20, e24] = Object.values(ENGINES);
  assert.ok(e16.accelMult < e20.accelMult && e20.accelMult < e24.accelMult);
  assert.ok(e16.topSpeedMult < 1 && e24.topSpeedMult > 1);
  assert.ok(e16.mass < 1 && e24.mass > 1 && e16.turboBurnMult < 1 && e24.turboBurnMult > 1);
  assert.ok(CHASSIS.leve.mass < 1 && CHASSIS.pesado.mass > 1);
  assert.ok(TANKS.pequeno.capacity < 1 && TANKS.grande.capacity > 1);
  assert.ok(TANKS.pequeno.mass < 1 && TANKS.grande.mass > 1);

  const p = withParts({ engine: 'e24', chassis: 'pesado', tank: 'grande' });
  assert.ok(Object.isFrozen(p));
  assert.equal(p.mass, 1 * e24.mass * CHASSIS.pesado.mass * TANKS.grande.mass);
  assert.equal(p.turboCapacity, TANKS.grande.capacity);
  assert.equal(p.TURBO_DEPLETE, BASE_PARAMS.TURBO_DEPLETE * e24.turboBurnMult);
  assert.equal(p.TURBO_RECHARGE, BASE_PARAMS.TURBO_RECHARGE);
  assert.equal(p.accelNormal, BASE_PARAMS.accelNormal * e24.accelMult);
  assert.equal(p.maxSpeedTurbo, BASE_PARAMS.maxSpeedTurbo * e24.topSpeedMult);
  assert.throws(() => withParts({ engine: 'v8' }), /unknown engine/);
  assert.throws(() => withParts({ chassis: 'carbono' }), /unknown chassis/);
  assert.throws(() => withParts({ tank: 'infinito' }), /unknown tank/);
});

test('mass and tank physics: lighter = more acceleration but less stable; bigger tank = more turbo, slower refill', () => {
  const light = withParts({ chassis: 'leve' });
  const heavy = withParts({ chassis: 'pesado' });
  const base = withParts();
  const sprint = (p) => runRace({ stage: TERRAINS.dirt, params: p, driver: up }).samples.find((s) => s.x >= SPRINT_X).t;
  assert.ok(sprint(light) < sprint(base) && sprint(base) < sprint(heavy));
  assert.ok(reboundHeight(light) > reboundHeight(base) && reboundHeight(base) > reboundHeight(heavy));
  assert.ok(airSpin(light) > airSpin(base) && airSpin(base) > airSpin(heavy));
  const small = withParts({ tank: 'pequeno' });
  const big = withParts({ tank: 'grande' });
  assert.ok(turboTime(small) < turboTime(base) && turboTime(base) < turboTime(big));
  assert.ok(refillTime(small) < refillTime(base) && refillTime(base) < refillTime(big));
  // Fuel stays normalized 0..1 whatever the tank.
  const car = createCarPhysics({ track: DIRT_TRACK, params: big });
  for (let i = 0; i < 600; i++) {
    car.step(DT, { up: true, space: i % 120 < 60, locked: false });
    assert.ok(car.state.fuel >= 0 && car.state.fuel <= 1);
  }
});

test('CA-010: every engine, chassis and tank swap changes race time, top speed or turbo time by >= 3%', () => {
  // Identical automated input: constant Up on the sand fixture (as CA-008) + held turbo from a full tank.
  const measure = (p) => {
    const r = runRace({ stage: areia, params: p, driver: up });
    assert.equal(r.finished, true);
    return { time: r.finishTime, maxSpeed: r.maxSpeed, turbo: turboTime(p) };
  };
  const ref = measure(withParts());
  for (const [kind, tab] of Object.entries(NEW_KINDS)) {
    for (const id of Object.keys(tab)) {
      if (id === DEFAULT_PARTS[kind]) continue;
      const m = measure(withParts({ [kind]: id }));
      const d = Math.max(relDiff(m.time, ref.time), relDiff(m.maxSpeed, ref.maxSpeed), relDiff(m.turbo, ref.turbo));
      assert.ok(d >= 0.03, `${kind} ${id}: ${(d * 100).toFixed(2)}%`);
    }
  }
});

test('CDC-102: no part is dominant — in every context of the other parts, each swap wins somewhere', () => {
  const cards = allCards();
  for (const c of COMBOS) {
    for (const [kind, tab] of Object.entries(KINDS)) {
      for (const other of Object.keys(tab)) {
        if (other === c[kind]) continue;
        const mine = cards.get(comboKey(c));
        const theirs = cards.get(comboKey({ ...c, [kind]: other }));
        assert.ok(beatsSomewhere(mine, theirs), `${kind} '${other}' strictly dominates '${c[kind]}' in ${comboKey(c)}`);
      }
    }
  }
});

test('CDC-102: no build (combination of all parts) is strictly superior to every other build', () => {
  const cards = allCards();
  for (const c of COMBOS) {
    const mine = cards.get(comboKey(c));
    const someoneBeatsIt = COMBOS.some((d) => d !== c && beatsSomewhere(cards.get(comboKey(d)), mine));
    assert.ok(someoneBeatsIt, `${comboKey(c)} beats every other build on every metric`);
  }
});

test('CDC-102 check is not vacuous: an engine with more HP and no cost is reported as dominant', () => {
  const cheat = { ...withParts({ engine: 'e24' }), mass: 1, TURBO_DEPLETE: BASE_PARAMS.TURBO_DEPLETE };
  const cards = { e20: scorecard(withParts()), cheat: scorecard(cheat) };
  assert.equal(beatsSomewhere(cards.e20, cards.cheat), false);
  assert.equal(beatsSomewhere(cards.cheat, cards.e20), true);
});

test('engine preset slightly changes the engine sound model; default engine = ENGINE_DEFAULTS', () => {
  assert.equal(ENGINE_DEFAULTS.engine, DEFAULT_PARTS.engine);
  assert.deepEqual(createEngineModel().config, { ...ENGINE_DEFAULTS });
  assert.deepEqual(createEngineModel({ engine: 'e20', gearboxPreset: 'padrao' }).config, { ...ENGINE_DEFAULTS });
  assert.throws(() => createEngineModel({ engine: 'v8' }), /unknown engine/);
  const cfg = (id) => createEngineModel({ engine: id }).config;
  // Smaller engine revs higher and sounds brighter; bigger one revs lower and sounds deeper.
  assert.ok(cfg('e16').idleRpm > cfg('e20').idleRpm && cfg('e20').idleRpm > cfg('e24').idleRpm);
  assert.ok(cfg('e16').redlineRpm > cfg('e20').redlineRpm && cfg('e20').redlineRpm > cfg('e24').redlineRpm);
  assert.ok(ENGINES.e16.timbre > 1 && ENGINES.e24.timbre < 1);
  // Slight: every override within 15% of the default.
  for (const id of ['e16', 'e24']) {
    for (const [k, v] of Object.entries(ENGINES[id].sound)) {
      assert.ok(relDiff(v, ENGINE_DEFAULTS[k]) <= 0.15, `${id}.${k} ${v}`);
    }
  }
  // Explicit options still win over the preset.
  assert.equal(createEngineModel({ engine: 'e24', redlineRpm: 3900 }).config.redlineRpm, 3900);

  // Driven through a turbo race with each engine's physics, RPM stays inside that engine's range
  // and every gearbox still shifts; the shift points (heard as RPM drops) move with the engine.
  const mata = registry.getStage('mata-atlantica');
  const driver = (s) => ({ up: true, space: true, right: s.airborne });
  const firstShift = {};
  for (const engine of Object.keys(ENGINES)) {
    for (const gearbox of Object.keys(GEARBOXES)) {
      const params = withParts({ engine, gearbox });
      const race = runRace({ stage: mata, params, driver, initialState: { infiniteTurbo: true } });
      const model = createEngineModel({ engine, gearboxPreset: gearbox });
      const { idleRpm, redlineRpm } = model.config;
      let maxGear = 1;
      for (const s of race.samples) {
        const o = model.update(DT, { speed: s.speed, throttle: 1, airborne: s.airborne });
        assert.ok(o.rpm >= idleRpm && o.rpm <= redlineRpm, `${engine}/${gearbox} rpm ${o.rpm}`);
        maxGear = Math.max(maxGear, o.gear);
      }
      assert.ok(maxGear >= 3, `${engine}/${gearbox}: top gear ${maxGear}`);
    }
    // Linear speed ramp 0 -> 30 m/s over 10 s at full throttle: speed of the first upshift.
    const m = createEngineModel({ engine });
    for (let i = 1; i <= 600; i++) {
      const speed = (30 * i) / 600;
      if (m.update(DT, { speed, throttle: 1, airborne: false }).gear > 1) { firstShift[engine] = speed; break; }
    }
  }
  assert.ok(firstShift.e16 > firstShift.e20 && firstShift.e20 > firstShift.e24, JSON.stringify(firstShift));
});
