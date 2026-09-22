// EP-006-02: applyCarLook (garage color + tire look) on the procedural cars. Runs in Node with a
// minimal canvas stub (car.js draws procedural textures at build time); checks materials/meshes,
// not pixels. Visual approval is the human UX gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal document/canvas stub: every 2D context call is a no-op.
const ctx2d = new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
  set: (t, k, v) => { t[k] = v; return true; },
});
globalThis.document ??= {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }),
  createElementNS: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {} }),
};

const { makeCar, makeBesouro, makeCarGLB, applyCarLook } = await import('../../src/car.js');
const { CAR_COLORS, DEFAULT_COLOR, getCarColor } = await import('../../src/parts/colors.js');
const { TIRES } = await import('../../src/parts/presets.js');

// Snapshot of every material color/map/roughness and mesh scale in the car tree.
function snapshot(car) {
  const out = [];
  car.group.traverse((n) => {
    const mats = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
    out.push({
      scale: n.scale.toArray(),
      mats: mats.map((m) => ({ color: m.color?.getHex(), map: m.map?.uuid ?? null, rough: m.roughness })),
    });
  });
  return out;
}
// Texture uuids differ per call only if a new texture was created; normalize to identity by index.
function normalizeMaps(snap) {
  const ids = new Map();
  return JSON.stringify(snap, (k, v) => (k === 'map' && v ? (ids.has(v) ? ids.get(v) : ids.set(v, ids.size).get(v)) : v));
}

test('makeCar() without args keeps the original look (red body, misto tire)', () => {
  const car = makeCar();
  assert.equal(car.look.bodyMats[0].color.getHex(), 0xb71f1f);
  assert.equal(getCarColor(DEFAULT_COLOR).hex, 0xb71f1f);
  assert.ok(car.look.studs.length === 64 && car.look.studs.every((s) => s.scale.equals({ x: 1, y: 1, z: 1 })));
  assert.equal(car.look.treadMat.color.getHex(), 0x121214);
});

test('default look (vermelho + misto) is an identity on makeCar()', () => {
  const ref = normalizeMaps(snapshot(makeCar()));
  const car = makeCar();
  applyCarLook(car, { color: 'azul', tire: 'offroad' });
  applyCarLook(car, { color: DEFAULT_COLOR, tire: 'misto' });
  assert.equal(normalizeMaps(snapshot(car)), ref);
  assert.equal(normalizeMaps(snapshot(makeCar({ color: DEFAULT_COLOR, tire: 'misto' }))), ref);
});

test('every garage color recolors the body; trims follow the body color', () => {
  for (const c of CAR_COLORS) {
    const car = makeCar();
    applyCarLook(car, { color: c.id });
    assert.equal(car.look.bodyMats[0].color.getHex(), c.hex, c.id);
    const [crease] = car.look.shadeMats[0];
    if (c.id !== DEFAULT_COLOR) assert.notEqual(crease.color.getHex(), c.hex, `${c.id} crease visible`);
    // hex number is accepted too
    applyCarLook(car, { color: c.hex });
    assert.equal(car.look.bodyMats[0].color.getHex(), c.hex);
  }
});

test('the three tires look distinct from each other', () => {
  const looks = Object.keys(TIRES).map((tire) => {
    const car = makeCar({ tire });
    const h = car.look;
    return JSON.stringify({ stud: h.studs[0].scale.toArray(), tread: h.treadMat.color.getHex(), side: h.tireSideMats[0].map.uuid });
  });
  assert.equal(new Set(looks).size, 3);
  const off = makeCar({ tire: 'offroad' }).look.studs[0].scale;
  const road = makeCar({ tire: 'estrada' }).look.studs[0].scale;
  assert.ok(off.x > 1 && road.x < 1, 'off-road lugs deeper than misto, estrada shallower');
});

test('omitted fields are left unchanged; unknown ids throw', () => {
  const car = makeCar({ color: 'verde', tire: 'offroad' });
  applyCarLook(car, { tire: 'estrada' });
  assert.equal(car.look.bodyMats[0].color.getHex(), getCarColor('verde').hex);
  applyCarLook(car, { color: 'roxo' });
  assert.equal(car.look.studs[0].scale.x, makeCar({ tire: 'estrada' }).look.studs[0].scale.x);
  assert.throws(() => applyCarLook(car, { color: 'dourado' }), /unknown car color/);
  assert.throws(() => applyCarLook(car, { tire: 'slick' }), /unknown tire/);
});

test('Besouro accepts the look; GLB car (no look handle) is returned unchanged', () => {
  const b = makeBesouro();
  applyCarLook(b, { color: 'azul', tire: 'offroad' });
  assert.equal(b.look.bodyMats[0].color.getHex(), getCarColor('azul').hex);
  assert.ok(b.look.studs[0].scale.x > 1);
  const glb = makeCarGLB();
  assert.equal(applyCarLook(glb, { color: 'azul', tire: 'offroad' }), glb);
});
