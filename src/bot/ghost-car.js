/**
 * @module bot/ghost-car
 * @summary Optional translucent "ghost" of the opponent (EP-008-11): the same Bandeirante mesh,
 * rendered see-through and tinted, placed from the bot physics state that already runs in main.js.
 * Purely decorative: it reads `botCar.state`, never writes to it, has no collision and no physics,
 * so race times, the bot simulation and the physics goldens are untouched. Off-screen it is culled
 * (the pivot is hidden and nothing else is computed), and while the option is off nothing is built.
 */
import * as THREE from 'three';
import { makeCar, SUSP_REST } from '../car.js';
import { BASE_PARAMS } from '../physics/params.js';

/** @summary Ghost look/culling knobs (tuning object, edit here). */
export const GHOST_TUNING = Object.freeze({
  /** Base transparency of every ghost material. */
  opacity: 0.62,
  /** Ghost hue: body colors are blended towards it so the ghost never reads as the player car. */
  tint: 0x6fdcff,
  /** How far each material color is pulled to `tint` (1 = fully tinted; keep some of the car's own
   *  shading, otherwise the silhouette flattens into a pale blob against the misty background). */
  tintMix: 0.6,
  /** Cold self-illumination, so the ghost stays readable against dark ground. */
  emissive: 0x2a86b8,
  emissiveIntensity: 0.5,
  /** Extra world metres beyond the camera edge kept visible before culling. */
  cullMargin: 3,
  /** Render order: after the opaque scene, like the other transparent car parts. */
  renderOrder: 4,
});

const CAR_HALF_HEIGHT = BASE_PARAMS.CAR_HALF_HEIGHT;
const WHEEL_SPIN_PER_M = 2.3; // same factor main.js uses for the player wheels

/** Turns every material of a built car into a translucent tinted ghost (in place). */
function ghostify(root) {
  const tint = new THREE.Color(GHOST_TUNING.tint);
  const seen = new Set();
  root.traverse((obj) => {
    if (obj.isSprite) {
      obj.visible = false; // exhaust smoke is never emitted for the ghost
      return;
    }
    if (!obj.isMesh) return;
    obj.renderOrder = GHOST_TUNING.renderOrder;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      m.transparent = true;
      m.opacity = GHOST_TUNING.opacity;
      m.depthWrite = false; // the ghost must never punch a hole in the track behind it
      if (m.color) m.color.lerp(tint, GHOST_TUNING.tintMix);
      if (m.emissive) {
        m.emissive.setHex(GHOST_TUNING.emissive);
        m.emissiveIntensity = GHOST_TUNING.emissiveIntensity;
      }
      if ('clearcoat' in m) m.clearcoat = 0; // window sheen would read as a solid car
      if ('metalness' in m) m.metalness = Math.min(m.metalness, 0.15);
      m.needsUpdate = true;
    }
  });
}

/**
 * Builds the ghost car and adds it to `scene`, hidden. `look` is the bot's garage look (only the
 * tire matters: the body is tinted anyway). The returned `update` must be called after the player
 * car has been stepped, with the same `dt` as the race loop.
 * @summary Create the bot ghost: `{ setEnabled, update, dispose }`.
 * @param {{ scene: THREE.Scene, look?: { tire?: string }, build?: (look?: object) => object }} opts
 */
export function createGhostCar({ scene, look, build = makeCar }) {
  const built = build(look);
  // No second point light in the scene and no debug hitbox: the ghost costs one extra mesh group.
  built.headlight.parent?.remove(built.headlight);
  built.hitboxDebug.visible = false;
  built.flame.visible = false;
  ghostify(built.group);

  const pivot = new THREE.Group();
  pivot.add(built.group);
  pivot.visible = false;
  scene.add(pivot);

  let enabled = false;

  /** @summary Show/hide the ghost for the next race (off = nothing is rendered nor computed). */
  function setEnabled(on) {
    enabled = !!on;
    if (!enabled) pivot.visible = false;
  }

  /**
   * Places the ghost at the bot's world position, relative to the player (the camera follows the
   * player at world x = 0, exactly like track-scene.js scrolls by `playerX`).
   * @param {object} bot `botCar.state`
   * @param {number} playerX player world x (the current scroll)
   * @param {number} dt seconds of this frame
   * @param {number} halfWidth camera half width in world units (`camera.right`)
   */
  function update(bot, playerX, dt, halfWidth) {
    if (!enabled || !bot) return;
    const dx = bot.x - playerX;
    const onScreen = Math.abs(dx) <= halfWidth + GHOST_TUNING.cullMargin;
    pivot.visible = onScreen;
    if (!onScreen) return;
    pivot.rotation.z = bot.rot;
    const cosR = Math.cos(bot.rot);
    const wheelLift = Math.max(0, cosR) * 0.5 * (1 - cosR);
    pivot.position.set(dx, bot.y + CAR_HALF_HEIGHT + wheelLift, 0);
    built.bodyGroup.position.y = bot.suspY;
    const factor = Math.max(0.25, 1 + bot.suspY / SUSP_REST);
    for (const s of built.springs) {
      s.group.scale.y = factor;
      for (const ring of s.rings) ring.scale.y = 1 / factor;
    }
    const wheelSpin = -bot.speed * dt * WHEEL_SPIN_PER_M;
    for (const w of built.wheels) w.rotation.y += wheelSpin;
    built.flame.visible = !!bot.turboActive;
  }

  /** @summary Remove the ghost from the scene and free its geometries/materials. */
  function dispose() {
    scene.remove(pivot);
    const seen = new Set();
    pivot.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const m of mats) {
        if (m && !seen.has(m)) {
          seen.add(m);
          m.dispose();
        }
      }
    });
  }

  return { setEnabled, update, dispose };
}
