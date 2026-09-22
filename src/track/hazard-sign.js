/**
 * @module track/hazard-sign
 * @summary Low-poly roadside warning sign ("!" on a yellow triangle) used to announce a hazard
 * zone. Purely decorative: no collision, no physics, never read by the simulation.
 */
import * as THREE from 'three';

/** Tuning knobs — sizes are world units (= metres); the ortho camera shows ~10 units of height. */
export const SIGN_TUNING = Object.freeze({
  postHeight: 2.0,
  postWidth: 0.18,
  postColor: 0x8b8f96,
  plateRadius: 1.08,      // circumradius of the outer (border) triangle
  plateInnerRatio: 0.82,  // yellow face as a fraction of the border triangle
  plateGap: 0.18,         // vertical gap between the post top and the plate bottom edge
  plateDepth: 0.14,
  borderColor: 0x1d1206,
  faceColor: 0xffc61a,
  markColor: 0x1d1206,
  markWidth: 0.18,
  markBarHeight: 0.54,
  markDotSize: 0.18,
  markGap: 0.14,
});

/** Equilateral triangle (3-segment circle) pointing up, centred on its centroid. */
function triangleGeometry(radius) {
  const geo = new THREE.CircleGeometry(radius, 3);
  geo.rotateZ(Math.PI / 2); // first vertex from +x to +y
  return geo;
}

function flatMaterial(color, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1.0,
    metalness: 0,
    emissive: emissiveIntensity > 0 ? color : 0x000000,
    emissiveIntensity,
  });
}

/**
 * @summary Builds one warning sign. Its origin sits on the ground at the sign's track position,
 * with the plate facing the camera (+z).
 * @returns {THREE.Group}
 */
export function createHazardSign() {
  const t = SIGN_TUNING;
  const group = new THREE.Group();

  const post = new THREE.Mesh(
    new THREE.BoxGeometry(t.postWidth, t.postHeight, t.postWidth),
    flatMaterial(t.postColor),
  );
  post.position.set(0, t.postHeight / 2, 0);
  group.add(post);

  // Triangle centroid so that the bottom edge (at -radius/2) clears the post top by plateGap.
  const plateY = t.postHeight + t.plateGap + t.plateRadius / 2;

  // Backing slab: gives the flat plate some low-poly thickness from the side.
  const slab = new THREE.Mesh(triangleGeometry(t.plateRadius), flatMaterial(t.borderColor));
  slab.position.set(0, plateY, -t.plateDepth / 2);
  group.add(slab);

  const border = new THREE.Mesh(triangleGeometry(t.plateRadius), flatMaterial(t.borderColor));
  border.position.set(0, plateY, t.plateDepth / 2);
  group.add(border);

  const face = new THREE.Mesh(
    triangleGeometry(t.plateRadius * t.plateInnerRatio),
    flatMaterial(t.faceColor, 0.35),
  );
  face.position.set(0, plateY, t.plateDepth / 2 + 0.02);
  group.add(face);

  // Exclamation mark, centred on the incircle of the yellow triangle.
  const markMat = flatMaterial(t.markColor);
  const markZ = t.plateDepth / 2 + 0.06;
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(t.markWidth, t.markBarHeight, 0.08),
    markMat,
  );
  bar.position.set(0, plateY + (t.markDotSize + t.markGap) / 2, markZ);
  group.add(bar);

  const dot = new THREE.Mesh(
    new THREE.BoxGeometry(t.markDotSize, t.markDotSize, 0.08),
    markMat,
  );
  dot.position.set(0, plateY - (t.markBarHeight + t.markGap) / 2, markZ);
  group.add(dot);

  return group;
}
