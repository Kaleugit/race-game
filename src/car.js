import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const WHEEL_RADIUS = 0.5;
export const SUSP_REST = 0.110;
export const SUSP_MAX_COMPRESS = 0.110;
export const SUSP_MAX_EXTEND = 0.066;

export const DEBUG_CRASH_HITBOX = false;
export const CHASSIS_HITBOX = [
  [-1.05,  0.40],
  [-1.05,  0.68],
  [ 0.55,  0.68],
  [ 0.55,  0.40],
  [ 0.45,  0.26],
  [ 1.45,  0.26],
  [ 1.45,  0.05],
];

let _smokeTex = null;
function getSmokeTex() {
  if (_smokeTex) return _smokeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  // cloud shape: multiple overlapping dark blobs
  const blobs = [
    [64, 64, 38], [50, 52, 26], [78, 50, 24],
    [58, 76, 22], [74, 72, 20], [44, 68, 18], [82, 64, 16],
  ];
  for (const [bx, by, br] of blobs) {
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0,   'rgba(5,5,5,0.9)');
    g.addColorStop(0.5, 'rgba(10,10,10,0.5)');
    g.addColorStop(1,   'rgba(10,10,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  _smokeTex = new THREE.CanvasTexture(c);
  return _smokeTex;
}

let _tireSideTex = null;
function makeTireSideTexture() {
  if (_tireSideTex) return _tireSideTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#121214';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#2a2a32';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 128, 70, 0, Math.PI * 2);
  ctx.stroke();
  const drawArcText = (text, baseAngle, radius) => {
    ctx.save();
    ctx.translate(128, 128);
    ctx.fillStyle = '#f4f4f0';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const charStep = 0.19;
    const startAngle = baseAngle - ((text.length - 1) * charStep) / 2;
    for (let i = 0; i < text.length; i++) {
      const a = startAngle + i * charStep;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -radius);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };
  drawArcText('MANTIQUEIRA', 0, 90);
  drawArcText('MANTIQUEIRA', Math.PI, 90);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  _tireSideTex = tex;
  return tex;
}

export function makeCar() {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb71f1f, flatShading: true, roughness: 0.5, metalness: 0.2 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xd62828, flatShading: true, roughness: 0.5, metalness: 0.2 });
  const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x4a9fc8, roughness: 0.0, metalness: 0.0, reflectivity: 1.0, clearcoat: 1.0, clearcoatRoughness: 0.0, transparent: true, opacity: 0.72, emissive: 0x0a1e2e, emissiveIntensity: 0.2 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x121214, flatShading: true, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x6a6a72, flatShading: true, roughness: 0.4, metalness: 0.7 });
  const springMat = new THREE.MeshStandardMaterial({ color: 0x9aa0b0, flatShading: true, roughness: 0.4, metalness: 0.7 });
  const rodMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, flatShading: true, roughness: 0.5, metalness: 0.6 });

  const bodyGroup = new THREE.Group();

  const body = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.7, 1.4, 2, 0.05), bodyMat);
  body.position.y = -0.25;
  bodyGroup.add(body);

  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.15, 1.35, 2, 0.03), bodyMat);
  hood.position.set(0.95, 0.10, 0);
  bodyGroup.add(hood);

  const cabin = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.70, 1.4, 2, 0.05), bodyMat);
  cabin.position.set(-0.45, 0.30, 0);
  bodyGroup.add(cabin);

  const wndFront = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.42, 1.05, 2, 0.04), windowMat);
  wndFront.position.set(0.57, 0.375, 0);
  bodyGroup.add(wndFront);

  const wndBack = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.28, 0.70, 2, 0.04), windowMat);
  wndBack.position.set(-1.45, 0.375, 0);
  bodyGroup.add(wndBack);

  const sideWndGeo = new RoundedBoxGeometry(0.62, 0.32, 0.05, 2, 0.022);
  const sideWndBackGeo = new RoundedBoxGeometry(1.10, 0.28, 0.05, 2, 0.022);
  const sideWndOffsets = [0.69, -0.69];
  for (const sz of sideWndOffsets) {
    const wf = new THREE.Mesh(sideWndGeo, windowMat);
    wf.position.set(0.13, 0.395, sz);
    bodyGroup.add(wf);
    const wb = new THREE.Mesh(sideWndBackGeo, windowMat);
    wb.position.set(-0.87, 0.395, sz);
    bodyGroup.add(wb);
  }

  // door panel creases on each side
  const creaseCol = 0x7a0808;
  const creaseMat = new THREE.MeshStandardMaterial({ color: creaseCol, flatShading: true, roughness: 0.8, metalness: 0.1 });
  // vertical B-pillar gap: x=-0.25, from body bottom (-0.58) to cabin base (0.08)
  const creaseVGeo = new THREE.BoxGeometry(0.022, 0.66, 0.018);
  // horizontal door-top crease: along x, just below cabin floor
  const creaseHGeo = new THREE.BoxGeometry(1.90, 0.022, 0.018);
  for (const sz of [0.705, -0.705]) {
    const cv = new THREE.Mesh(creaseVGeo, creaseMat);
    cv.position.set(-0.25, -0.25, sz);
    bodyGroup.add(cv);
    const ch = new THREE.Mesh(creaseHGeo, creaseMat);
    ch.position.set(-0.45, 0.07, sz);
    bodyGroup.add(ch);
  }

  const rackMat = new THREE.MeshStandardMaterial({ color: 0x14141a, flatShading: true, roughness: 0.6, metalness: 0.5 });
  const rackRailGeo = new THREE.BoxGeometry(1.5, 0.04, 0.05);
  const rackRailL = new THREE.Mesh(rackRailGeo, rackMat);
  rackRailL.position.set(-0.25, 0.72, 0.50);
  bodyGroup.add(rackRailL);
  const rackRailR = new THREE.Mesh(rackRailGeo, rackMat);
  rackRailR.position.set(-0.25, 0.72, -0.50);
  bodyGroup.add(rackRailR);
  const rackBarGeo = new THREE.BoxGeometry(0.05, 0.04, 1.10);
  const rackBarOffsets = [-0.85, -0.40, 0.05, 0.45];
  for (const bx of rackBarOffsets) {
    const bar = new THREE.Mesh(rackBarGeo, rackMat);
    bar.position.set(bx, 0.72, 0);
    bodyGroup.add(bar);
  }

  const rackPostGeo = new THREE.BoxGeometry(0.04, 0.07, 0.04);
  for (const px of [0.50, -1.00]) {
    for (const pz of [0.50, -0.50]) {
      const post = new THREE.Mesh(rackPostGeo, rackMat);
      post.position.set(px, 0.685, pz);
      bodyGroup.add(post);
    }
  }

  const roofLightMat = new THREE.MeshStandardMaterial({ color: 0xffd86b, emissive: 0xffd86b, emissiveIntensity: 1.6, flatShading: true });
  const roofLightGeo = new THREE.SphereGeometry(0.072, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const roofLightBackMat = new THREE.MeshStandardMaterial({ color: 0x111114, flatShading: true, roughness: 0.7 });
  const roofLightBackGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.015, 10);
  for (const lz of [0.45, 0.15, -0.15, -0.45]) {
    const rl = new THREE.Mesh(roofLightGeo, roofLightMat);
    rl.position.set(0.55, 0.72, lz);
    rl.rotation.z = -Math.PI / 2;
    bodyGroup.add(rl);
    const back = new THREE.Mesh(roofLightBackGeo, roofLightBackMat);
    back.position.set(0.55, 0.72, lz);
    back.rotation.z = Math.PI / 2;
    bodyGroup.add(back);
  }
  const roofPointLight = new THREE.PointLight(0xffd86b, 0.5, 5, 2);
  roofPointLight.position.set(0.55, 0.95, 0);
  bodyGroup.add(roofPointLight);

  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfff5c0 });
  const headGeo = new THREE.SphereGeometry(0.13, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const hl1 = new THREE.Mesh(headGeo, headLightMat);
  hl1.position.set(1.51, -0.10, 0.45);
  hl1.rotation.z = -Math.PI / 2;
  bodyGroup.add(hl1);
  const hl2 = new THREE.Mesh(headGeo, headLightMat);
  hl2.position.set(1.51, -0.10, -0.45);
  hl2.rotation.z = -Math.PI / 2;
  bodyGroup.add(hl2);

  // front turn signals — small yellow hemispheres, one per side, bumper level
  const blinkerMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const blinkerGeo = new THREE.SphereGeometry(0.034, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const sz of [0.45, -0.45]) {
    const blinker = new THREE.Mesh(blinkerGeo, blinkerMat);
    blinker.position.set(1.57, -0.28, sz);
    blinker.rotation.z = -Math.PI / 2;
    bodyGroup.add(blinker);
  }

  // front grille between headlights
  const grilleBgMat = new THREE.MeshStandardMaterial({ color: 0x2e2e38, flatShading: true, roughness: 0.7 });
  const grilleBg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.58), grilleBgMat);
  grilleBg.position.set(1.53, -0.22, 0);
  bodyGroup.add(grilleBg);
  const grilleBarMat = new THREE.MeshStandardMaterial({ color: 0xc8d0d8, flatShading: true, roughness: 0.1, metalness: 0.95 });
  const grilleBarGeo = new THREE.BoxGeometry(0.06, 0.04, 0.56);
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(grilleBarGeo, grilleBarMat);
    bar.position.set(1.55, -0.12 + i * -0.07, 0);
    bodyGroup.add(bar);
  }

  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const tail1 = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.1, 0.18, 2, 0.015), tailMat);
  tail1.position.set(-1.52, -0.10, 0.5);
  bodyGroup.add(tail1);
  const tail2 = tail1.clone();
  tail2.position.z = -0.5;
  bodyGroup.add(tail2);
  const tailPointLight = new THREE.PointLight(0xff2a2a, 0.8, 4, 2);
  tailPointLight.position.set(-2.0, -0.10, 0);
  bodyGroup.add(tailPointLight);

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e0, flatShading: true, roughness: 0.08, metalness: 0.95 });
  // front bumper
  const bumpGeo = new THREE.BoxGeometry(0.085, 0.22, 1.44);
  const bumpF = new THREE.Mesh(bumpGeo, chromeMat);
  bumpF.position.set(1.56, -0.54, 0);
  bodyGroup.add(bumpF);
  const bumpR = new THREE.Mesh(bumpGeo, chromeMat);
  bumpR.position.set(-1.56, -0.54, 0);
  bodyGroup.add(bumpR);

  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 256; plateCanvas.height = 96;
  const pCtx = plateCanvas.getContext('2d');
  pCtx.fillStyle = '#e8e8d8';
  pCtx.fillRect(0, 0, 256, 96);
  pCtx.strokeStyle = '#222';
  pCtx.lineWidth = 5;
  pCtx.strokeRect(4, 4, 248, 88);
  pCtx.fillStyle = '#111';
  pCtx.font = 'bold 38px monospace';
  pCtx.textAlign = 'center';
  pCtx.textBaseline = 'middle';
  pCtx.fillText('kaleu.dev\u00AE', 128, 50);
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4, emissive: 0xd0e8ff, emissiveIntensity: 0.04 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.50), plateMat);
  plate.position.set(-1.605, -0.62, 0.48);
  bodyGroup.add(plate);

  // vertical exhaust pipes — one per side, near A-pillar
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x9aa0b0, flatShading: true, roughness: 0.4, metalness: 0.7 });
  const exPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.55, -0.51, 0.74),
    new THREE.Vector3(0.55,  0.62, 0.74),
    new THREE.Vector3(0.52,  0.70, 0.74),
    new THREE.Vector3(0.43,  0.82, 0.74),
  ]);
  const exTube = new THREE.Mesh(new THREE.TubeGeometry(exPath, 24, 0.06, 10, false), exhaustMat);
  bodyGroup.add(exTube);
  // flare at exit — rotation matches curve end direction (-0.6, 0.8)
  const exFlare = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.06, 10), exhaustMat);
  exFlare.rotation.z = Math.atan2(0.6, 0.8);
  exFlare.position.set(0.415, 0.843, 0.74);
  bodyGroup.add(exFlare);
  // heat shield — half-cylinder wrapping the outer face of the pipe, opening inward
  const shieldAlpha = (() => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#000';
    const cols = 4, rows = 5, hW = 16, hH = 9;
    const spX = 128 / cols, spY = 128 / rows;
    for (let r = 0; r < rows; r++) {
      const offX = (r % 2) * (spX / 2);
      for (let col = 0; col < cols + 1; col++) {
        ctx.beginPath();
        ctx.ellipse(col * spX + offX, (r + 0.5) * spY, hW / 2, hH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 4);
    return tex;
  })();
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c8, flatShading: true, roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide, alphaMap: shieldAlpha, transparent: true, alphaTest: 0.5 });
  const shieldGeo = new THREE.CylinderGeometry(0.098, 0.098, 0.55, 14, 1, true, -Math.PI / 2, Math.PI);
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.position.set(0.55, 0.055, 0.74);
  bodyGroup.add(shield);
  // end caps (thin flat arcs closing the top and bottom of the shield)
  for (const endY of [-0.275 + 0.055, 0.275 + 0.055]) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.098, 0.098, 0.012, 14, 1, true, -Math.PI / 2, Math.PI),
      shieldMat
    );
    cap.position.set(0.55, endY, 0.74);
    bodyGroup.add(cap);
  }

  const flameGeo = new THREE.ConeGeometry(0.22, 1.0, 6, 4);
  flameGeo.rotateZ(Math.PI / 2);
  const flameBase = new THREE.Color(0x6cc8ff);
  const flameMid = new THREE.Color(0xff7a3a);
  const flameTip = new THREE.Color(0xfff066);
  const flamePos = flameGeo.attributes.position;
  const flameColors = new Float32Array(flamePos.count * 3);
  const tmpColor = new THREE.Color();
  for (let i = 0; i < flamePos.count; i++) {
    const t = (flamePos.getX(i) + 0.5);
    if (t >= 0.5) tmpColor.lerpColors(flameMid, flameBase, (t - 0.5) * 2);
    else tmpColor.lerpColors(flameTip, flameMid, t * 2);
    flameColors[i * 3]     = tmpColor.r;
    flameColors[i * 3 + 1] = tmpColor.g;
    flameColors[i * 3 + 2] = tmpColor.b;
  }
  flameGeo.setAttribute('color', new THREE.BufferAttribute(flameColors, 3));
  const flameMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(-2.0, -0.20, 0);
  flame.visible = false;
  bodyGroup.add(flame);

  root.add(bodyGroup);

  const tireSideTex = makeTireSideTexture();
  const wheelGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.32, 16);
  const tireSideMat = new THREE.MeshStandardMaterial({ map: tireSideTex, color: 0xffffff, flatShading: true, roughness: 0.85 });
  const wheelMats = [wheelMat, tireSideMat, tireSideMat];
  const rimGeo = new THREE.CylinderGeometry(WHEEL_RADIUS * 0.45, WHEEL_RADIUS * 0.45, 0.34, 8);
  const studGeo = new THREE.BoxGeometry(0.035, 0.35, 0.035);
  const lugBoltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6);
  const lugBoltMat = new THREE.MeshStandardMaterial({ color: 0xb0b4c0, flatShading: true, roughness: 0.3, metalness: 0.85 });
  const hubCapGeo = new THREE.CylinderGeometry(WHEEL_RADIUS * 0.15, WHEEL_RADIUS * 0.15, 0.06, 10);
  const hubCapMat = new THREE.MeshStandardMaterial({ color: 0x9aa0b0, flatShading: true, roughness: 0.35, metalness: 0.8 });
  const wheelXZ = [
    [-1.0, 0.92], [-1.0, -0.92],
    [1.0,  0.92], [1.0,  -0.92],
  ];
  const wheelY = -0.50;
  const studCount = 16;
  const studDistance = WHEEL_RADIUS + 0.00;
  const lugCount = 5;
  const lugRadius = WHEEL_RADIUS * 0.30;
  const wheels = [];
  for (const [x, z] of wheelXZ) {
    const w = new THREE.Mesh(wheelGeo, wheelMats);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, wheelY, z);
    root.add(w);

    const r = new THREE.Mesh(rimGeo, rimMat);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, wheelY, z);
    root.add(r);

    for (let i = 0; i < studCount; i++) {
      const angle = (i / studCount) * Math.PI * 2;
      const stud = new THREE.Mesh(studGeo, wheelMat);
      stud.position.set(Math.cos(angle) * studDistance, 0, Math.sin(angle) * studDistance);
      stud.rotation.y = -angle;
      w.add(stud);
    }

    const rimFaceY = Math.sign(z) * 0.18;
    for (let i = 0; i < lugCount; i++) {
      const angle = (i / lugCount) * Math.PI * 2;
      const lug = new THREE.Mesh(lugBoltGeo, lugBoltMat);
      lug.position.set(Math.cos(angle) * lugRadius, rimFaceY, Math.sin(angle) * lugRadius);
      w.add(lug);
    }
    const hubCap = new THREE.Mesh(hubCapGeo, hubCapMat);
    hubCap.position.set(0, rimFaceY, 0);
    w.add(hubCap);

    wheels.push(w);
  }

  // visible axles — one cylinder per axle pair spanning between the two wheels
  const axleMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, flatShading: true, roughness: 0.5, metalness: 0.7 });
  const axleSpan = 0.92 * 2; // wheel-to-wheel distance
  const axleGeo = new THREE.CylinderGeometry(0.055, 0.055, axleSpan, 8);
  axleGeo.rotateX(Math.PI / 2);
  for (const ax of [-1.0, 1.0]) {
    const axle = new THREE.Mesh(axleGeo, axleMat);
    axle.position.set(ax, wheelY, 0);
    root.add(axle);
  }

  const ringGeo = new THREE.TorusGeometry(0.07, 0.018, 5, 12);
  ringGeo.rotateX(Math.PI / 2);
  const ringCount = 3;
  const springBaseY = 0.0;
  const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, SUSP_REST, 6);

  const springs = [];
  for (const [x, z] of wheelXZ) {
    const sg = new THREE.Group();
    const springZ = Math.sign(z) * 0.76;
    sg.position.set(x, springBaseY, springZ);

    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.y = SUSP_REST / 2;
    sg.add(rod);

    const rings = [];
    const ringSpacing = SUSP_REST / (ringCount - 1);
    for (let i = 0; i < ringCount; i++) {
      const ring = new THREE.Mesh(ringGeo, springMat);
      ring.position.y = i * ringSpacing;
      sg.add(ring);
      rings.push(ring);
    }

    root.add(sg);
    springs.push({ group: sg, rings, ringSpacing });
  }

  const carHeadlight = new THREE.PointLight(0xfff5c0, 0.7, 9, 2);
  carHeadlight.position.set(2.5, -0.15, 0);
  bodyGroup.add(carHeadlight);

  const hitboxDebug = new THREE.Group();
  hitboxDebug.visible = DEBUG_CRASH_HITBOX;
  const dbgMat = new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false });
  const dbgGeo = new THREE.SphereGeometry(0.06, 6, 5);
  for (const [lx, ly] of CHASSIS_HITBOX) {
    const m = new THREE.Mesh(dbgGeo, dbgMat);
    m.position.set(lx, ly, 0);
    m.renderOrder = 999;
    hitboxDebug.add(m);
  }
  const linePts = CHASSIS_HITBOX.map(([lx, ly]) => new THREE.Vector3(lx, ly, 0));
  const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: false });
  const loop = new THREE.LineLoop(lineGeo, lineMat);
  loop.renderOrder = 999;
  hitboxDebug.add(loop);
  bodyGroup.add(hitboxDebug);

  const EXHAUST_EXIT = new THREE.Vector3(0.397, 0.867, 0.74);
  const EXHAUST_ANG  = Math.atan2(0.6, 0.8);
  const darkCapMat = new THREE.MeshBasicMaterial({ color: 0x080808 });
  const exhaustCap = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.01, 10), darkCapMat);
  exhaustCap.rotation.z = EXHAUST_ANG;
  exhaustCap.position.copy(EXHAUST_EXIT);
  bodyGroup.add(exhaustCap);

  const smokeTex = getSmokeTex();
  const SMOKE_POOL = 100;
  const smokeParticles = [];
  for (let i = 0; i < SMOKE_POOL; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    s.renderOrder = 5;
    root.add(s);
    smokeParticles.push({ s, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, maxOpacity: 0.3, maxSize: 0.2 });
  }
  let _smokeTimer = 0;

  function updateSmoke(dt, intensity, carSpeed = 0, turbulent = false) {
    const cfgs = [
      null,
      { rate: 0.12, speed: 0.40, opacity: 0.60, size: 0.50, life: 2.2 },
      { rate: 0.05, speed: 0.70, opacity: 0.78, size: 0.80, life: 1.8 },
      { rate: 0.02, speed: 1.10, opacity: 0.92, size: 1.20, life: 1.5 },
    ];
    const cfg = cfgs[Math.min(3, Math.max(1, intensity || 1))];
    // blend direction: 0 speed = (-0.6x, 0.8y), max speed = (-1.0x, 0.0y)
    const sf = Math.min(1, Math.abs(carSpeed) / (250 / 9));
    const dirX = -0.6 + (-1.0 - (-0.6)) * sf;
    const dirY =  0.8 * (1 - sf);
    const baseUpward = 0.2 * (1 - sf);

    _smokeTimer -= dt;
    if (_smokeTimer <= 0) {
      _smokeTimer = (turbulent ? 0.04 : cfg.rate) * (0.7 + Math.random() * 0.6);
      const p = smokeParticles.find(p => p.life <= 0);
      if (p) {
        p.maxLife = (turbulent ? 0.8 : cfg.life) * (0.8 + Math.random() * 0.4);
        p.life = p.maxLife;
        p.s.position.set(
          EXHAUST_EXIT.x + (Math.random() - 0.5) * (turbulent ? 0.2 : 0.04),
          EXHAUST_EXIT.y + (Math.random() - 0.5) * (turbulent ? 0.2 : 0.02),
          EXHAUST_EXIT.z + (Math.random() - 0.5) * (turbulent ? 0.2 : 0.03),
        );
        const spd = (turbulent ? 0.6 : cfg.speed) * (0.7 + Math.random() * 0.6);
        if (turbulent) {
          // chaotic: random direction in all axes
          const angle = Math.random() * Math.PI * 2;
          p.vx = Math.cos(angle) * spd * (0.8 + Math.random() * 0.4);
          p.vy = (Math.random() - 0.3) * spd;
          p.vz = Math.sin(angle) * spd * (0.8 + Math.random() * 0.4);
        } else {
          p.vx = dirX * spd + (Math.random() - 0.5) * 0.15;
          p.vy = dirY * spd + baseUpward + Math.random() * 0.05 * (1 - sf);
          p.vz = (Math.random() - 0.5) * 0.2;
        }
        p.maxOpacity = cfg.opacity;
        p.maxSize = cfg.size * (0.6 + Math.random() * 0.8);
        p.s.visible = true;
      }
    }
    for (const p of smokeParticles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      const t = p.life / p.maxLife;
      const sz = p.maxSize * (0.15 + (1 - t) * 0.85);
      p.s.scale.set(sz, sz, 1);
      let opa;
      if (t > 0.85)      opa = p.maxOpacity * ((1 - t) / 0.15);
      else if (t > 0.25) opa = p.maxOpacity;
      else               opa = p.maxOpacity * (t / 0.25);
      p.s.material.opacity = opa;
    }
  }

  return { group: root, wheels, bodyGroup, springs, flame, headlight: carHeadlight, hitboxDebug, updateSmoke };
}

export function makeBesouro() {
  const root = new THREE.Group();

  const bodyMat  = new THREE.MeshStandardMaterial({ color: 0xffe050, flatShading: true, roughness: 0.45, metalness: 0.12 });
  const bodyDark = new THREE.MeshStandardMaterial({ color: 0xd4b800, flatShading: true, roughness: 0.5,  metalness: 0.10 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, flatShading: true, roughness: 0.1, metalness: 0.7, emissive: 0x060c18, emissiveIntensity: 0.5 });
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x3a3a42, flatShading: true, roughness: 0.7, metalness: 0.3 });
  const wheelMat  = new THREE.MeshStandardMaterial({ color: 0x121214, flatShading: true, roughness: 0.9 });
  const rimMat    = new THREE.MeshStandardMaterial({ color: 0x6a6a72, flatShading: true, roughness: 0.4, metalness: 0.7 });
  const springMat = new THREE.MeshStandardMaterial({ color: 0x9aa0b0, flatShading: true, roughness: 0.4, metalness: 0.7 });
  const rodMat    = new THREE.MeshStandardMaterial({ color: 0x4a4a52, flatShading: true, roughness: 0.5, metalness: 0.6 });

  const bodyGroup = new THREE.Group();

  const sill = new THREE.Mesh(new THREE.BoxGeometry(2.70, 0.32, 1.38), bodyMat);
  sill.position.set(-0.05, 0.16, 0);
  bodyGroup.add(sill);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.50, 0.30, 1.42), bodyMat);
  lower.position.set(-0.05, 0.44, 0);
  bodyGroup.add(lower);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.38, 1.38), bodyMat);
  cabin.position.set(-0.18, 0.72, 0);
  bodyGroup.add(cabin);

  const cabinUp = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.28, 1.28), bodyMat);
  cabinUp.position.set(-0.22, 1.00, 0);
  bodyGroup.add(cabinUp);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 1.14), bodyMat);
  roof.position.set(-0.26, 1.20, 0);
  bodyGroup.add(roof);

  const fFender = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.44, 1.44), bodyMat);
  fFender.position.set(0.96, 0.22, 0);
  bodyGroup.add(fFender);

  const rFender = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.44, 1.44), bodyMat);
  rFender.position.set(-0.96, 0.22, 0);
  bodyGroup.add(rFender);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.10, 1.26), bodyDark);
  hood.position.set(1.12, 0.36, 0);
  bodyGroup.add(hood);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 1.26), bodyDark);
  deck.position.set(-1.14, 0.30, 0);
  bodyGroup.add(deck);

  const wsFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.50, 1.10), windowMat);
  wsFront.position.set(0.52, 0.80, 0);
  wsFront.rotation.z = -0.60;
  bodyGroup.add(wsFront);

  const wsRear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 1.10), windowMat);
  wsRear.position.set(-0.68, 0.80, 0);
  wsRear.rotation.z = 0.58;
  bodyGroup.add(wsRear);

  const sideWGeo = new THREE.BoxGeometry(0.52, 0.24, 0.05);
  for (const sz of [0.70, -0.70]) {
    const sw = new THREE.Mesh(sideWGeo, windowMat);
    sw.position.set(-0.12, 0.90, sz);
    bodyGroup.add(sw);
  }

  const fBump = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.30), bumperMat);
  fBump.position.set(1.44, -0.06, 0);
  bodyGroup.add(fBump);

  const rBump = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.30), bumperMat);
  rBump.position.set(-1.44, -0.06, 0);
  bodyGroup.add(rBump);

  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfff5c0 });
  const hGeo = new THREE.SphereGeometry(0.10, 8, 6);
  for (const bz of [0.38, -0.38]) {
    const hl = new THREE.Mesh(hGeo, headLightMat);
    hl.position.set(1.42, 0.12, bz);
    bodyGroup.add(hl);
  }

  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const bz of [0.44, -0.44]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.14), tailMat);
    tl.position.set(-1.44, 0.12, bz);
    bodyGroup.add(tl);
  }
  const tailPL = new THREE.PointLight(0xff2a2a, 0.7, 4, 2);
  tailPL.position.set(-1.8, 0.1, 0);
  bodyGroup.add(tailPL);

  const flameGeo = new THREE.ConeGeometry(0.18, 0.85, 6, 4);
  flameGeo.rotateZ(Math.PI / 2);
  const flameBase = new THREE.Color(0x6cc8ff);
  const flameMid  = new THREE.Color(0xff7a3a);
  const flameTip  = new THREE.Color(0xfff066);
  const flamePos  = flameGeo.attributes.position;
  const flameColors = new Float32Array(flamePos.count * 3);
  const tmpColor = new THREE.Color();
  for (let i = 0; i < flamePos.count; i++) {
    const t = flamePos.getX(i) + 0.5;
    if (t >= 0.5) tmpColor.lerpColors(flameMid, flameBase, (t - 0.5) * 2);
    else           tmpColor.lerpColors(flameTip, flameMid, t * 2);
    flameColors[i * 3] = tmpColor.r; flameColors[i * 3 + 1] = tmpColor.g; flameColors[i * 3 + 2] = tmpColor.b;
  }
  flameGeo.setAttribute('color', new THREE.BufferAttribute(flameColors, 3));
  const flameMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(-1.8, -0.15, 0);
  flame.visible = false;
  bodyGroup.add(flame);

  root.add(bodyGroup);

  const tireSideTex = makeTireSideTexture();
  const wheelGeo  = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.32, 16);
  const tireSideM = new THREE.MeshStandardMaterial({ map: tireSideTex, color: 0xffffff, flatShading: true, roughness: 0.85 });
  const wheelMats = [wheelMat, tireSideM, tireSideM];
  const rimGeo    = new THREE.CylinderGeometry(WHEEL_RADIUS * 0.45, WHEEL_RADIUS * 0.45, 0.34, 8);
  const studGeo   = new THREE.BoxGeometry(0.035, 0.35, 0.035);
  const lugBGeo   = new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6);
  const lugBMat   = new THREE.MeshStandardMaterial({ color: 0xb0b4c0, flatShading: true, roughness: 0.3, metalness: 0.85 });
  const hubGeo    = new THREE.CylinderGeometry(WHEEL_RADIUS * 0.15, WHEEL_RADIUS * 0.15, 0.06, 10);
  const hubMat    = new THREE.MeshStandardMaterial({ color: 0x9aa0b0, flatShading: true, roughness: 0.35, metalness: 0.8 });

  const wheelXZ = [[-1.0, 0.62], [-1.0, -0.62], [1.0, 0.62], [1.0, -0.62]];
  const wheelY  = -0.50;
  const studDist = WHEEL_RADIUS + 0.025;
  const lugR     = WHEEL_RADIUS * 0.30;
  const wheels   = [];

  for (const [x, z] of wheelXZ) {
    const w = new THREE.Mesh(wheelGeo, wheelMats);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, wheelY, z);
    root.add(w);

    const r = new THREE.Mesh(rimGeo, rimMat);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, wheelY, z);
    root.add(r);

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const s = new THREE.Mesh(studGeo, wheelMat);
      s.position.set(Math.cos(a) * studDist, 0, Math.sin(a) * studDist);
      s.rotation.y = -a;
      w.add(s);
    }

    const rimFY = Math.sign(z) * 0.18;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(lugBGeo, lugBMat);
      lug.position.set(Math.cos(a) * lugR, rimFY, Math.sin(a) * lugR);
      w.add(lug);
    }
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(0, rimFY, 0);
    w.add(hub);
    wheels.push(w);
  }

  const ringGeo2 = new THREE.TorusGeometry(0.07, 0.018, 5, 12);
  ringGeo2.rotateX(Math.PI / 2);
  const rodGeo2 = new THREE.CylinderGeometry(0.022, 0.022, SUSP_REST, 6);
  const springs = [];

  for (const [x, z] of wheelXZ) {
    const sg = new THREE.Group();
    sg.position.set(x, 0.0, Math.sign(z) * 0.85);
    const rod = new THREE.Mesh(rodGeo2, rodMat);
    rod.position.y = SUSP_REST / 2;
    sg.add(rod);
    const rings = [];
    const rsp = SUSP_REST / 2;
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeo2, springMat);
      ring.position.y = i * rsp;
      sg.add(ring);
      rings.push(ring);
    }
    root.add(sg);
    springs.push({ group: sg, rings, ringSpacing: rsp });
  }

  const carHeadlight = new THREE.PointLight(0xfff5c0, 0.7, 9, 2);
  carHeadlight.position.set(2.2, 0.0, 0);
  bodyGroup.add(carHeadlight);

  const hitboxDebug = new THREE.Group();
  hitboxDebug.visible = DEBUG_CRASH_HITBOX;
  const dbgMat = new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false });
  const dbgGeo = new THREE.SphereGeometry(0.06, 6, 5);
  for (const [lx, ly] of CHASSIS_HITBOX) {
    const m = new THREE.Mesh(dbgGeo, dbgMat);
    m.position.set(lx, ly, 0);
    m.renderOrder = 999;
    hitboxDebug.add(m);
  }
  const linePts2 = CHASSIS_HITBOX.map(([lx, ly]) => new THREE.Vector3(lx, ly, 0));
  const lineGeo2 = new THREE.BufferGeometry().setFromPoints(linePts2);
  const lineMat2 = new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: false });
  const loop2 = new THREE.LineLoop(lineGeo2, lineMat2);
  loop2.renderOrder = 999;
  hitboxDebug.add(loop2);
  bodyGroup.add(hitboxDebug);

  return { group: root, wheels, bodyGroup, springs, flame, headlight: carHeadlight, hitboxDebug };
}

// ── GLB car loader ────────────────────────────────────────────────────────────
let _cachedGLB = null;
const _glbLoader = new GLTFLoader();

export function preloadCarGLB() {
  if (_cachedGLB) return Promise.resolve();
  return new Promise((resolve, reject) =>
    _glbLoader.load('/car_glb.glb',
      (gltf) => { _cachedGLB = gltf; resolve(); },
      null,
      reject,
    )
  );
}

export function makeCarGLB() {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  if (_cachedGLB) {
    const model = _cachedGLB.scene.clone(true);
    model.traverse((n) => {
      if (n.isMesh) {
        if (Array.isArray(n.material)) {
          n.material = n.material.map((m) => { const c = m.clone(); c.flatShading = true; c.needsUpdate = true; return c; });
        } else {
          n.material = n.material.clone();
          n.material.flatShading = true;
          n.material.needsUpdate = true;
        }
      }
    });
    // rotate to side-profile orientation (front of car → +X, same as other cars)
    model.rotation.y = Math.PI / 2;
    model.updateMatrixWorld(true);
    // scale after rotation so bounding box reflects the side-profile dimensions
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = Math.min(3.2 / size.x, 1.8 / size.y, 1.6 / size.z);
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model);
    const center = box2.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y -= box2.min.y;
    model.position.z -= center.z;
    bodyGroup.add(model);
  }

  const headlight = new THREE.PointLight(0xfff5c0, 0.7, 9, 2);
  headlight.position.set(2.2, 0.5, 0);
  bodyGroup.add(headlight);

  const flame = new THREE.Mesh();
  flame.visible = false;

  const hitboxDebug = new THREE.Group();
  hitboxDebug.visible = false;

  return { group: root, wheels: [], bodyGroup, springs: [], flame, headlight, hitboxDebug };
}
