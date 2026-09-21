/**
 * @module track/track-scene
 * @summary Three.js scene objects for a stage (road, mud layer, ground, sky background,
 * finish portal, surface-zone overlays), built only from stage data + track query.
 * Meshes/values moved verbatim from the pre-migration src/main.js.
 */
import * as THREE from 'three';
import { makeRoadTexture } from '../textures.js';

const ROAD_W = 80;
const ROAD_D = 7;
const ROAD_SEGMENTS = 220;

const MUD_W = 80;
const MUD_D = 10;
const MUD_SEGMENTS = 120;

const ZONE_SEG_PER_UNIT = 2;
const ZONE_LIFT = 0.02;
const ZONE_FALLBACK_COLOR = 0x888888;

function makeMudTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 8 + Math.random() * 28;
    const angle = Math.random() * Math.PI * 2;
    ctx.strokeStyle = `rgba(${20 + Math.random() * 18 | 0},${14 + Math.random() * 12 | 0},${5 + Math.random() * 10 | 0},0.55)`;
    ctx.lineWidth = 0.8 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 3 + Math.random() * 14;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(28,18,10,0.7)');
    grad.addColorStop(1, 'rgba(28,18,10,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.8 + Math.random() * 1.6;
    const tone = 70 + Math.random() * 60;
    ctx.fillStyle = `rgb(${tone + 12 | 0},${tone | 0},${Math.max(0, tone - 25) | 0})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeFinishPortal() {
  const finishPortal = new THREE.Group();

  // two side poles
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const poleGeo = new THREE.CylinderGeometry(0.18, 0.18, 7, 8);
  const poleL = new THREE.Mesh(poleGeo, poleMat);
  poleL.position.set(0, 3.5, -2.2);
  finishPortal.add(poleL);
  const poleR = new THREE.Mesh(poleGeo, poleMat);
  poleR.position.set(0, 3.5, 2.2);
  finishPortal.add(poleR);

  // arch across the top — series of box segments forming a curve
  const archMat = new THREE.MeshLambertMaterial({ color: 0xffd86b, emissive: 0xffa030, emissiveIntensity: 0.6 });
  const archSegments = 12;
  const archRadius = 2.4;
  const archCenterY = 7;
  for (let i = 0; i <= archSegments; i++) {
    const t = i / archSegments;
    const angle = Math.PI * t; // 0 → π (left pole to right pole)
    const az = -Math.cos(angle) * archRadius;
    const ay = Math.sin(angle) * archRadius * 0.55 + archCenterY;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 0.36), archMat);
    seg.position.set(0, ay, az);
    finishPortal.add(seg);
  }

  // checkered ground marking — alternating black/white strips along Z
  const tileW = 0.5;
  const tileD = 0.55;
  const cols = 8;
  const rows = 2;
  const matW = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const matB = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isWhite = (r + c) % 2 === 0;
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(tileD, 0.05, tileW),
        isWhite ? matW : matB
      );
      tile.position.set(
        (r - rows / 2 + 0.5) * tileD,
        0.025,
        (c - cols / 2 + 0.5) * tileW
      );
      finishPortal.add(tile);
    }
  }
  return finishPortal;
}

/** Deforms a strip plane (2 vertex rows) so row vertex i follows heightFn(i). */
function deformStrip(geo, segments, heightFn) {
  const positions = geo.attributes.position;
  for (let i = 0; i <= segments; i++) {
    const h = heightFn(i);
    positions.setY(i, h);
    positions.setY(i + segments + 1, h);
  }
  positions.needsUpdate = true;
  geo.computeVertexNormals();
}

/**
 * Surface-zone overlay: one flat strip per zone, colored from visuals.palette.zones[type].
 * Its shape is static relative to the zone, so it is deformed once and only translated.
 */
function makeZoneMesh(zone, track, palette) {
  const width = zone.to - zone.from;
  const segments = Math.max(1, Math.ceil(width * ZONE_SEG_PER_UNIT));
  const geo = new THREE.PlaneGeometry(width, ROAD_D, segments, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate(width / 2, 0, 0); // local x = 0 at zone.from
  deformStrip(geo, segments, (i) => track.heightAt(zone.from + (i / segments) * width) + ZONE_LIFT);
  const color = palette.zones && palette.zones[zone.type] != null
    ? palette.zones[zone.type]
    : ZONE_FALLBACK_COLOR;
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1.0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.from = zone.from;
  return mesh;
}

function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

/**
 * @summary Builds all stage-dependent scene objects and returns their per-frame updater.
 * @param {{scene: THREE.Scene, skyScene: THREE.Scene, stage: object, track: object}} opts
 *   track is the query returned by createTrack(stage).
 * @returns {{update(scroll: number): void, dispose(): void}}
 */
export function createTrackScene({ scene, skyScene, stage, track }) {
  const visuals = stage.visuals || {};
  const palette = visuals.palette || {};
  const surfaces = stage.surfaces || {};
  const objects = [];
  const add = (obj) => { scene.add(obj); objects.push(obj); return obj; };

  // road
  const roadGeo = new THREE.PlaneGeometry(ROAD_W, ROAD_D, ROAD_SEGMENTS, 1);
  roadGeo.rotateX(-Math.PI / 2);
  const roadTex = makeRoadTexture();
  roadTex.repeat.set(8, 1);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.1
  });
  add(new THREE.Mesh(roadGeo, roadMat));

  // ground (hidden, as in the prototype)
  const groundGeo = new THREE.PlaneGeometry(80, 18);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: palette.ground != null ? palette.ground : 0x1a2818,
    flatShading: true,
  });
  const ground = add(new THREE.Mesh(groundGeo, groundMat));
  ground.position.set(0, -0.05, -16);
  ground.visible = false;

  // mud layer (visual only)
  let mudGeo = null;
  let mudTex = null;
  if (visuals.mudLayer) {
    mudTex = makeMudTexture();
    mudTex.repeat.set(20, 3);
    mudGeo = new THREE.PlaneGeometry(MUD_W, MUD_D, MUD_SEGMENTS, 1);
    mudGeo.rotateX(-Math.PI / 2);
    const mudMat = new THREE.MeshStandardMaterial({ map: mudTex, flatShading: true, roughness: 1.0 });
    add(new THREE.Mesh(mudGeo, mudMat)).position.set(0, 0, 0);
  }

  // surface-zone overlays
  const zoneMeshes = (surfaces.zones || []).map((z) => add(makeZoneMesh(z, track, palette)));

  // finish portal
  const finishPortal = add(makeFinishPortal());

  // sky background
  let disposed = false;
  let skyTex = null;
  if (visuals.background) {
    new THREE.TextureLoader().load(visuals.background, (tex) => {
      if (disposed) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      skyTex = tex;
      skyScene.background = tex;
    });
  }

  function update(scroll) {
    const finishRelX = track.finishX - scroll;
    finishPortal.position.x = finishRelX;
    finishPortal.position.y = track.heightAt(scroll + finishRelX);

    deformStrip(roadGeo, ROAD_SEGMENTS,
      (i) => track.heightAt(scroll + (-ROAD_W / 2 + (i / ROAD_SEGMENTS) * ROAD_W)));
    if (mudGeo) {
      deformStrip(mudGeo, MUD_SEGMENTS,
        (i) => track.heightAt(scroll + (-MUD_W / 2 + (i / MUD_SEGMENTS) * MUD_W)) - 0.05);
      mudTex.offset.x = scroll / 8;
    }
    roadTex.offset.x = scroll / 10;

    for (const m of zoneMeshes) m.position.x = m.userData.from - scroll;
  }

  function dispose() {
    disposed = true;
    for (const obj of objects) {
      scene.remove(obj);
      disposeObject(obj);
    }
    objects.length = 0;
    if (skyTex) {
      if (skyScene.background === skyTex) skyScene.background = null;
      skyTex.dispose();
      skyTex = null;
    }
  }

  return { update, dispose };
}
