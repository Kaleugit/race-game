import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makeSkyTexture, makeMountainTexture, makeHillTexture, makeRoadTexture } from './textures.js';
import { initLobby } from './lobby.js';
import { makeCar, makeCarGLB, WHEEL_RADIUS, SUSP_REST, SUSP_MAX_COMPRESS, SUSP_MAX_EXTEND, DEBUG_CRASH_HITBOX, CHASSIS_HITBOX } from './car.js';
import { initEngineSound } from './sound.js';

const DEV_MODE = location.search.includes('dev');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

let aspect = window.innerWidth / window.innerHeight;
const VIEW_H = 5;
const camera = new THREE.OrthographicCamera(
  -aspect * VIEW_H, aspect * VIEW_H, VIEW_H, -VIEW_H, 0.1, 200,
);
camera.position.set(0, 6, 14);
camera.lookAt(0, 4, 0);
const CAM_Y_OFFSET = 4;
const CAM_LOOK_Y_OFFSET = 2;
const CAM_FOLLOW_LERP = 0.28;

const ambient = new THREE.AmbientLight(0x6478a8, 0.55);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffd6a8, 1.4);
sun.position.set(-8, 12, 8);
scene.add(sun);
const rim = new THREE.DirectionalLight(0xff7a4a, 0.5);
rim.position.set(15, 4, -10);
scene.add(rim);

const SLOPES = [
  { x: 80,  w: 40, dh: 1.5 },
  { x: 200, w: 15, dh: 1.0 },
  { x: 290, w: 30, dh: -2.0 },
  { x: 400, w: 12, dh: 2.0 },
  { x: 500, w: 25, dh: -1.5 },
  { x: 220,   w: 40, dh: 25 },
  { x: 298.5, w: 57, dh: -25 },
  { x: 600, w: 8,  dh: -1.5 },
  { x: 720, w: 40, dh: 0.5 },
  { x: 820, w: 6,  dh: 1.0 },
];

const FEATURES = [
  { x: 75,  type: 'wave',    w: 6,  h: 0.2, count: 3 },
  { x: 95,  type: 'bell',    w: 3,  h: 0.7 },
  { x: 130, type: 'valley',  w: 6,  h: 0.6 },
  { x: 165, type: 'plateau', w: 8,  h: 1.0 },
  { x: 200, type: 'bell',    w: 3,  h: 0.8 },
  { x: 240, type: 'asym',    w: 6,  h: 1.4, leftFactor: 0.4 },
  { x: 285, type: 'wave',    w: 5,  h: 0.2, count: 3 },
  { x: 340, type: 'plateau', w: 10, h: 0.8 },
  { x: 370, type: 'bell',    w: 4,  h: 1.2 },
  { x: 400, type: 'bell',    w: 2.5, h: 1.0 },
  { x: 430, type: 'valley',  w: 6,  h: 0.8 },
  { x: 460, type: 'wave',    w: 8,  h: 0.3, count: 4 },
  { x: 500, type: 'plateau', w: 8,  h: 0.6 },
  { x: 640, type: 'wave',    w: 10, h: 0.4, count: 3 },
  { x: 680, type: 'valley',  w: 6,  h: 0.9 },
  { x: 710, type: 'wave',    w: 8,  h: 0.3, count: 4 },
  { x: 740, type: 'plateau', w: 6,  h: 0.8 },
  { x: 780, type: 'bell',    w: 4,  h: 1.4 },
  { x: 825, type: 'bell',    w: 3,  h: 0.8 },
];

const FINISH_LINE_X = 620;
const BOT_FINISH_TIME = 26;

function featureContribution(f, x) {
  const t = x - f.x;
  switch (f.type) {
    case 'bell': {
      if (Math.abs(t) >= f.w) return 0;
      const k = Math.cos(t * Math.PI / (2 * f.w));
      return f.h * k * k;
    }
    case 'valley': {
      if (Math.abs(t) >= f.w) return 0;
      const k = Math.cos(t * Math.PI / (2 * f.w));
      return -f.h * k * k;
    }
    case 'plateau': {
      const absT = Math.abs(t);
      if (absT >= f.w) return 0;
      const transition = f.w * 0.5;
      const flatLimit = f.w - transition;
      if (absT <= flatLimit) return f.h;
      const u = (f.w - absT) / transition;
      const smooth = u * u * (3 - 2 * u);
      return f.h * smooth;
    }
    case 'wave': {
      if (Math.abs(t) >= f.w) return 0;
      const env = Math.cos(t * Math.PI / (2 * f.w));
      const count = f.count || 3;
      return f.h * env * env * Math.sin(t * Math.PI * count / f.w);
    }
    case 'asym': {
      const leftFactor = f.leftFactor != null ? f.leftFactor : 0.4;
      if (t < 0) {
        const wL = f.w * leftFactor;
        if (t <= -wL) return 0;
        const k = Math.cos(t * Math.PI / (2 * wL));
        return f.h * k * k;
      } else {
        if (t >= f.w) return 0;
        const k = Math.cos(t * Math.PI / (2 * f.w));
        return f.h * k * k;
      }
    }
    default:
      return 0;
  }
}

function rampEase(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const a = 0.25;
  const slope = 1 / (1 - a);
  if (u < a) {
    const t = u / a;
    return slope * a * 0.5 * t * t;
  }
  if (u > 1 - a) {
    const t = (1 - u) / a;
    return 1 - slope * a * 0.5 * t * t;
  }
  return slope * a * 0.5 + slope * (u - a);
}

function baseElevation(x) {
  let h = 0;
  for (const s of SLOPES) {
    const t = (x - (s.x - s.w / 2)) / s.w;
    h += s.dh * rampEase(t);
  }
  return h;
}

function trackHeight(x) {
  let h = baseElevation(x)
        + Math.sin(x * 0.06) * 0.18
        + Math.sin(x * 0.13 + 1.7) * 0.10
        + Math.sin(x * 0.31 + 0.4) * 0.05;
  for (const f of FEATURES) {
    h += featureContribution(f, x);
  }
  return h;
}

const ROAD_W = 80;
const ROAD_D = 7;
const ROAD_SEGMENTS = 220;

const roadGeo = new THREE.PlaneGeometry(ROAD_W, ROAD_D, ROAD_SEGMENTS, 1);
roadGeo.rotateX(-Math.PI / 2);

const jungleRoadTex = makeRoadTexture();
jungleRoadTex.repeat.set(8, 1);

const roadMat = new THREE.MeshStandardMaterial({
  map: jungleRoadTex,
  flatShading: true,
  roughness: 0.8,
  metalness: 0.1
});
const road = new THREE.Mesh(roadGeo, roadMat);
scene.add(road);

const groundGeo = new THREE.PlaneGeometry(80, 18);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2818, flatShading: true });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.set(0, -0.05, -16);
ground.visible = false;

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

const mudTex = makeMudTexture();
mudTex.repeat.set(20, 3);


const MUD_W = 80;
const MUD_D = 10;
const MUD_SEGMENTS = 120;
const mudGeo = new THREE.PlaneGeometry(MUD_W, MUD_D, MUD_SEGMENTS, 1);
mudGeo.rotateX(-Math.PI / 2);
const mudMat = new THREE.MeshStandardMaterial({ map: mudTex, flatShading: true, roughness: 1.0 });
const mudStrip = new THREE.Mesh(mudGeo, mudMat);
mudStrip.position.set(0, 0, 0);
scene.add(mudStrip);

function deformMud() {
  const positions = mudGeo.attributes.position;
  for (let i = 0; i <= MUD_SEGMENTS; i++) {
    const localX = -MUD_W / 2 + (i / MUD_SEGMENTS) * MUD_W;
    const h = trackHeight(state.scroll + localX);
    positions.setY(i, h - 0.05);
    positions.setY(i + MUD_SEGMENTS + 1, h - 0.05);
  }
  positions.needsUpdate = true;
  mudGeo.computeVertexNormals();
}


function deformRoad() {
  const positions = roadGeo.attributes.position;
  for (let i = 0; i <= ROAD_SEGMENTS; i++) {
    const localX = -ROAD_W / 2 + (i / ROAD_SEGMENTS) * ROAD_W;
    const h = trackHeight(state.scroll + localX);
    positions.setY(i, h);
    positions.setY(i + ROAD_SEGMENTS + 1, h);
  }
  positions.needsUpdate = true;
  roadGeo.computeVertexNormals();
}

const SUSP_K = 77;
const SUSP_DAMP = 6.6;
const SUSP_RELEASE_BOOST = 5.5;

let carBuilt = makeCar();
let flame = carBuilt.flame;
let wheels = carBuilt.wheels;
let bodyGroup = carBuilt.bodyGroup;
let springs = carBuilt.springs;
let carHeadlight = carBuilt.headlight;
let hitboxDebug = carBuilt.hitboxDebug;
window.hitbox = (on) => {
  hitboxDebug.visible = on === undefined ? !hitboxDebug.visible : !!on;
  console.log('hitbox', hitboxDebug.visible ? 'ON' : 'OFF');
  return hitboxDebug.visible;
};
const carPivot = new THREE.Group();
carPivot.add(carBuilt.group);
scene.add(carPivot);

const CAR_HALF_HEIGHT = 1.00;

const GRID_SIZE = 200;
const GRID_DIV = 20;

const skyScene = new THREE.Scene();
skyScene.add(new THREE.AmbientLight(0xffffff, 1.5));
const skyCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
skyCamera.position.set(0, 4, 12);
skyCamera.lookAt(0, 0, -8);

new THREE.TextureLoader().load('/img/misty-tropical-jungle.jpg', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  skyScene.background = tex;
});

const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIV, 0x888888, 0x444444);
grid.position.set(0, 0, 0);
grid.visible = false;
scene.add(grid);


// finish portal group
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

scene.add(finishPortal);
const finishLineMesh = finishPortal; // alias for update loop

const keys = { up: false, down: false, left: false, right: false, space: false };
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') keys.up = true;
  if (e.key === 'ArrowDown') keys.down = true;
  if (e.key === 'ArrowLeft') keys.left = true;
  if (e.key === 'ArrowRight') keys.right = true;
  if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
  if (DEV_MODE) {
    if (e.key === 's' || e.key === 'S') {
      state.suspensionEnabled = !state.suspensionEnabled;
      if (suspEl) suspEl.textContent = state.suspensionEnabled ? 'ON' : 'OFF';
    }
    if (e.key === 't' || e.key === 'T') {
      state.infiniteTurbo = !state.infiniteTurbo;
      if (infTurboEl) infTurboEl.textContent = state.infiniteTurbo ? 'ON' : 'OFF';
    }
  }
  if (e.key === 'g' || e.key === 'G') {
    state.gridVisible = !state.gridVisible;
    grid.visible = state.gridVisible;
    if (posWrapEl) posWrapEl.style.display = state.gridVisible ? '' : 'none';
  }
  if (e.key === 'd' || e.key === 'D') {
    state.debugVisible = !state.debugVisible;
    if (hudDebugEl) hudDebugEl.style.display = state.debugVisible ? '' : 'none';
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') keys.up = false;
  if (e.key === 'ArrowDown') keys.down = false;
  if (e.key === 'ArrowLeft') keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
  if (e.code === 'Space') keys.space = false;
});

const touchpadEl = document.getElementById('touchpad');
const mobileToggleEl = document.getElementById('mobiletoggle');

const iosHintEl = document.getElementById('ios-hint');
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const fullscreenSupported = !!document.documentElement.requestFullscreen;

document.getElementById('ios-hint-close').addEventListener('click', () => {
  iosHintEl.classList.remove('show');
});

async function toggleTouch() {
  const showing = touchpadEl.classList.toggle('show');
  if (showing) {
    if (fullscreenSupported) {
      try { await document.documentElement.requestFullscreen(); } catch (_) {}
    } else if (!isStandalone()) {
      iosHintEl.classList.add('show');
    }
    if (screen.orientation && screen.orientation.lock) {
      try { await screen.orientation.lock('landscape'); } catch (_) {}
    }
  } else {
    iosHintEl.classList.remove('show');
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (_) {}
    }
  }
}

mobileToggleEl.addEventListener('click', toggleTouch);
document.getElementById('lobby-fullscreen').addEventListener('click', toggleTouch);
for (const btn of touchpadEl.querySelectorAll('.tbtn[data-key]')) {
  const k = btn.dataset.key;
  const press = (ev) => { ev.preventDefault(); keys[k] = true; };
  const release = (ev) => { ev.preventDefault(); keys[k] = false; };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('pointerleave', release);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

const gasTurboEl = document.getElementById('gasturbo');
let gasPointerId = null;
function updateGasTurbo(ev) {
  const r = gasTurboEl.getBoundingClientRect();
  const inside = ev.clientY >= r.top && ev.clientY <= r.bottom && ev.clientX >= r.left && ev.clientX <= r.right;
  const turbo = inside && (ev.clientY - r.top) < r.height * 0.5;
  keys.space = turbo;
  gasTurboEl.classList.toggle('turbo-on', turbo);
}
gasTurboEl.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  gasPointerId = ev.pointerId;
  gasTurboEl.setPointerCapture(ev.pointerId);
  keys.up = true;
  gasTurboEl.classList.add('gas-on');
  updateGasTurbo(ev);
});
gasTurboEl.addEventListener('pointermove', (ev) => {
  if (ev.pointerId !== gasPointerId) return;
  ev.preventDefault();
  updateGasTurbo(ev);
});
const releaseGasTurbo = (ev) => {
  if (ev.pointerId !== gasPointerId) return;
  ev.preventDefault();
  gasPointerId = null;
  keys.up = false;
  keys.space = false;
  gasTurboEl.classList.remove('gas-on', 'turbo-on');
};
gasTurboEl.addEventListener('pointerup', releaseGasTurbo);
gasTurboEl.addEventListener('pointercancel', releaseGasTurbo);
gasTurboEl.addEventListener('contextmenu', (e) => e.preventDefault());

const state = {
  speed: 0,
  maxSpeedNormal: 250 / 9,
  maxSpeedTurbo: 390 / 9,
  maxSpeedTurboOnly: 140 / 9,
  accelNormal: 14,
  accelTurbo: 30,
  accelTurboOnly: 18,
  brake: 26,
  reverseAccel: 8,
  maxReverse: 65 / 9,
  drag: 3.5,
  scroll: 0,
  bob: 0,
  y: 0,
  vy: 0,
  airborne: false,
  airTime: 0,
  bounceLevel: 1,
  angVel: 0,
  fuel: 1.0,
  turboActive: false,
  crashed: false,
  crashTimer: 0,
  crashSettling: false,
  crashSettleTimer: 0,
  suspY: 0,
  suspVy: 0,
  prevTrackH: 0,
  suspensionEnabled: true,
  infiniteTurbo: false,
  lean: 0,
  slopeRotVisual: 0,
  gridVisible: false,
  debugVisible: false,
  raceStarted: false,
  raceFinished: false,
  raceTime: 0,
  inputFrozen: true,
  botScroll: 0,
  botSpeed: 0,
  botTurboActive: false,
  botTurboCycle: 0,
  botFinishTime: null,
  botWon: false,
};

const GRAVITY = 23.4;
// BOT: base ~19 m/s, turbo 1.7× for 2.5s every 7s cycle → avg ≈ 23.8 m/s → 620m / 23.8 ≈ 26s
const BOT_BASE_SPEED   = 19;
const BOT_TURBO_MULT   = 1.7;
const BOT_CYCLE        = 7.0;
const BOT_TURBO_ON     = 2.5;

const TURBO_DEPLETE = 1 / 3.0;
const TURBO_RECHARGE = 1 / 6.0;

const engineSound = initEngineSound();
const GROUND_LEAN = 0.198;
const AIR_TORQUE = 9.0;
const CRASH_AUTO_RESET = 2.0;
const CRASH_SETTLE_DURATION = 4.0;
const BOUNCE_MIN_AIRTIME = 1.0;
const BOUNCE_AIRTIME_CAP = 4.0;
const BOUNCE_DECAY = 0.4;
const BOUNCE_CHASSIS_SCALE = 0.13;

const crashFadeEl = document.getElementById('crashfade');
const crashPromptEl = document.getElementById('crashprompt');
const crashTitleEl = document.getElementById('crashtitle');
const countdownOverlayEl = document.getElementById('countdown-overlay');
const countdownNumEl = document.getElementById('countdown-num');
const endOverlayEl = document.getElementById('end-overlay');
const endResultEl = document.getElementById('end-result');
const endPlayerTimeEl = document.getElementById('end-player-time');
const endBotTimeEl = document.getElementById('end-bot-time');
const endBestTimeEl = document.getElementById('end-best-time');
const endPlayAgainBtn = document.getElementById('end-play-again');

endPlayAgainBtn.addEventListener('click', () => {
  endOverlayEl.classList.remove('show');
  startCountdown();
});

document.getElementById('end-lobby-btn').addEventListener('click', () => {
  location.reload();
});

const btnRestartEl = document.getElementById('btn-restart');
btnRestartEl.addEventListener('click', () => {
  endOverlayEl.classList.remove('show');
  startCountdown();
});

function triggerCrash() {
  if (state.crashed || state.crashSettling) return;
  state.crashSettling = true;
  state.crashSettleTimer = 0;
  state.turboActive = false;
  flame.visible = false;
  crashPromptEl.classList.add('show');
  crashTitleEl.classList.add('show');
}

function finalizeCrash() {
  state.crashSettling = false;
  state.crashed = true;
  state.crashTimer = 0;
  state.speed = 0;
  state.vy = 0;
  state.angVel = 0;
  state.suspVy = 0;
  flame.visible = false;
}

function resetGame() {
  state.speed = 0;
  state.scroll = 0;
  state.bob = 0;
  state.y = 0;
  state.vy = 0;
  state.airborne = false;
  state.airTime = 0;
  state.bounceLevel = 1;
  state.angVel = 0;
  state.fuel = 1.0;
  state.turboActive = false;
  state.crashed = false;
  state.crashTimer = 0;
  state.crashSettling = false;
  state.crashSettleTimer = 0;
  state.suspY = 0;
  state.suspVy = 0;
  state.prevTrackH = 0;
  state.lean = 0;
  state.slopeRotVisual = 0;
  state.raceStarted = false;
  state.raceFinished = false;
  state.raceTime = 0;
  state.botScroll = 0;
  state.botSpeed = 0;
  state.botTurboActive = false;
  state.botTurboCycle = 0;
  state.botFinishTime = null;
  state.botWon = false;
  state.inputFrozen = true;
  carPivot.rotation.z = 0;
  carPivot.position.set(0, CAR_HALF_HEIGHT, 0);
  bodyGroup.position.y = 0;
  flame.visible = false;
  crashFadeEl.style.opacity = '0';
  crashPromptEl.classList.remove('show');
  crashTitleEl.classList.remove('show');
  endOverlayEl.classList.remove('show');
  if (btnRestartEl) btnRestartEl.style.display = 'none';
}

let countdownTimer = 0;
let countdownStep = 3;

function startCountdown() {
  resetGame();
  engineSound.start();
  countdownStep = 3;
  countdownTimer = 0;
  countdownNumEl.textContent = '3';
  countdownOverlayEl.classList.add('show');
}

function updateCountdown(dt) {
  if (!countdownOverlayEl.classList.contains('show')) return;
  countdownTimer += dt;
  if (countdownStep > 0 && countdownTimer >= (4 - countdownStep)) {
    countdownStep--;
    if (countdownStep > 0) {
      countdownNumEl.textContent = String(countdownStep);
    } else {
      countdownNumEl.textContent = 'GO!';
    }
  }
  if (countdownTimer >= 4) {
    countdownOverlayEl.classList.remove('show');
    state.inputFrozen = false;
    state.raceStarted = true;
    document.getElementById('btn-back-lobby').style.display = 'block';
    btnRestartEl.style.display = 'block';
    raceBarEl.classList.add('show');
  }
}

function showDefeatScreen() {
  state.botWon = true;
  endBotTimeEl.textContent = state.botFinishTime != null ? state.botFinishTime.toFixed(1) + 's' : '—';
  endPlayerTimeEl.textContent = state.raceTime.toFixed(1) + 's';
  const bestRaw = localStorage.getItem('race_best_time');
  const best = bestRaw ? parseFloat(bestRaw) : null;
  endBestTimeEl.textContent = best ? best.toFixed(1) + 's' : '—';
  endBestTimeEl.className = 't-val';
  endResultEl.textContent = 'DERROTA';
  endResultEl.className = 'derrota';
  endOverlayEl.classList.add('show');
  // player keeps racing — DO NOT freeze inputs or set raceFinished
}

function showEndScreen(playerWon) {
  state.raceFinished = true;
  state.inputFrozen = true;
  endBotTimeEl.textContent = state.botFinishTime != null ? state.botFinishTime.toFixed(1) + 's' : '—';
  endPlayerTimeEl.textContent = state.raceTime.toFixed(1) + 's';

  const bestRaw = localStorage.getItem('race_best_time');
  const best = bestRaw ? parseFloat(bestRaw) : null;
  const isBestNew = !best || state.raceTime < best;

  if (playerWon) {
    if (isBestNew) {
      localStorage.setItem('race_best_time', state.raceTime.toFixed(3));
      endBestTimeEl.textContent = state.raceTime.toFixed(1) + 's';
      endBestTimeEl.className = 't-best-new';
    } else {
      endBestTimeEl.textContent = best.toFixed(1) + 's';
      endBestTimeEl.className = 't-val';
    }
    endResultEl.textContent = 'VITÓRIA';
    endResultEl.className = 'vitoria';
  } else {
    endBestTimeEl.textContent = best ? best.toFixed(1) + 's' : '—';
    endBestTimeEl.className = 't-val';
    endResultEl.textContent = 'DERROTA';
    endResultEl.className = 'derrota';
  }

  engineSound.stop();
  endOverlayEl.classList.add('show');
}

const speedEl = document.getElementById('speed');
const distEl = document.getElementById('dist');
const fuelEl = document.getElementById('turbobar');
const suspEl = document.getElementById('suspstate');
const infTurboEl = document.getElementById('infturbo');
const botDistEl = document.getElementById('bot-dist');
const hudDebugEl = document.getElementById('hud-debug');
const raceBarEl = document.getElementById('race-bar');
const raceBarPlayerEl = document.getElementById('race-bar-player');
const raceBarBotEl = document.getElementById('race-bar-bot');


function updateTurbo(dt) {
  if (state.inputFrozen || state.crashSettling) {
    state.turboActive = false;
    flame.visible = false;
    carHeadlight.intensity = 0.7;
    return;
  }
  if (state.infiniteTurbo) {
    state.fuel = 1;
    state.turboActive = keys.space;
  } else if (keys.space && state.fuel > 0) {
    state.turboActive = true;
    state.fuel = Math.max(0, state.fuel - TURBO_DEPLETE * dt);
  } else {
    state.turboActive = false;
    if (!keys.space) state.fuel = Math.min(1, state.fuel + TURBO_RECHARGE * dt);
  }
  flame.visible = state.turboActive;
  if (state.turboActive) {
    flame.scale.set(0.85 + Math.random() * 0.4, 0.85 + Math.random() * 0.3, 0.85 + Math.random() * 0.3);
  }
  carHeadlight.intensity = state.turboActive ? 1.6 : 0.7;
}

function updateSpeed(dt) {
  let accel, maxSpeed;
  const inputLocked = state.crashSettling || state.inputFrozen;
  if (!inputLocked && keys.up && state.turboActive) {
    accel = state.accelTurbo;
    maxSpeed = state.maxSpeedTurbo;
  } else if (!inputLocked && state.turboActive) {
    accel = state.accelTurboOnly;
    maxSpeed = state.maxSpeedTurboOnly;
  } else if (!inputLocked && keys.up) {
    accel = state.accelNormal;
    maxSpeed = state.maxSpeedNormal;
  } else {
    accel = 0;
    maxSpeed = state.maxSpeedTurbo;
  }

  if (accel > 0 && state.speed < maxSpeed) state.speed += accel * dt;
  if (!inputLocked && keys.down) {
    if (state.speed > 0) state.speed -= state.brake * dt;
    else state.speed -= state.reverseAccel * dt;
  }

  if (!state.airborne) {
    const T = state.scroll;
    const slope = (trackHeight(T + 1) - trackHeight(T - 1)) / 2;
    const slopeAngle = Math.atan(slope);
    state.speed -= GRAVITY * 0.8 * Math.sin(slopeAngle) * dt;
  }

  state.speed -= Math.sign(state.speed) * state.drag * dt;

  if (accel > 0 && state.speed > maxSpeed) {
    state.speed = Math.max(maxSpeed, state.speed - (state.speed - maxSpeed) * 2.5 * dt);
  }
  const speedCap = state.maxSpeedTurbo * 1.6;
  state.speed = Math.max(-state.maxReverse, Math.min(speedCap, state.speed));
}

function computeAvg(scroll) {
  return (trackHeight(scroll + 1) + trackHeight(scroll - 1)) / 2;
}

function updatePhysics(dt) {
  const prevScroll = state.scroll;
  state.scroll += state.speed * dt;

  const avg = computeAvg(state.scroll);
  const avgPrev = computeAvg(prevScroll);
  const groundVy = dt > 0 ? (avg - avgPrev) / dt : 0;

  const leanLift = Math.abs(Math.sin(state.lean)) + 0.5 * Math.cos(state.lean) - 0.5;
  const groundLevel = avg + leanLift;

  state.vy -= GRAVITY * dt;
  state.y += state.vy * dt;

  if (state.y <= groundLevel) {
    const wasAirborne = state.airborne;
    const ballVy = state.vy;
    const airTime = state.airTime;
    state.y = groundLevel;
    state.vy = groundVy;
    state.airborne = false;
    state.airTime = 0;
    if (!wasAirborne) state.bounceLevel = 1;
    if (wasAirborne && ballVy < groundVy) {
      const impactSpeed = groundVy - ballVy;
      const intensity = state.bounceLevel;
      let r = carPivot.rotation.z;
      r = ((r + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      state.suspVy -= (3 + impactSpeed * 0.4) * intensity;
      if (airTime >= BOUNCE_MIN_AIRTIME && intensity > 0.05) {
        const t = Math.min(airTime, BOUNCE_AIRTIME_CAP);
        const bounceFactor = (0.2 + t * 0.3) * intensity * BOUNCE_CHASSIS_SCALE;
        state.vy = groundVy + impactSpeed * bounceFactor;
        state.airborne = true;
        state.bounceLevel *= BOUNCE_DECAY;
        state.angVel = 0;
      } else {
        carPivot.rotation.z = r;
        state.bounceLevel = 1;
        state.angVel = 0;
      }
    }
  } else {
    state.airborne = true;
    state.airTime += dt;
  }

  if (checkChassisHitbox()) {
    triggerCrash();
    return;
  }
}

function checkChassisHitbox() {
  if (state.crashSettling || state.crashed) return false;
  const cosA = Math.cos(carPivot.rotation.z);
  const sinA = Math.sin(carPivot.rotation.z);
  const wheelLift = Math.max(0, cosA) * 0.5 * (1 - cosA);
  const cy = state.y + CAR_HALF_HEIGHT + wheelLift;
  const yOff = bodyGroup.position.y;
  for (const [lx, ly] of CHASSIS_HITBOX) {
    const ay = ly + yOff;
    const wx = cosA * lx - sinA * ay;
    const wy = cy + sinA * lx + cosA * ay;
    const gh = trackHeight(state.scroll + wx);
    if (wy <= gh) return true;
  }
  return false;
}

function updateRotation(dt) {
  const inputLocked = state.crashSettling || state.inputFrozen;
  if (state.airborne) {
    if (!inputLocked && keys.left) state.angVel += AIR_TORQUE * dt;
    if (!inputLocked && keys.right) state.angVel -= AIR_TORQUE * dt;
    state.angVel *= 0.992;
    carPivot.rotation.z += state.angVel * dt;
  } else if (inputLocked) {
    state.angVel *= Math.max(0, 1 - 4 * dt);
    if (Math.abs(state.angVel) < 0.05) state.angVel = 0;
    carPivot.rotation.z += state.angVel * dt;
  } else {
    let leanInput = 0;
    if (keys.left && keys.up) {
      const forwardSpeed = Math.max(0, state.speed);
      const factor = 1 - Math.min(1, forwardSpeed / state.maxSpeedNormal);
      leanInput = GROUND_LEAN * factor;
    }
    if (keys.right && keys.down) {
      const reverseSpeed = Math.max(0, -state.speed);
      const factor = 1 - Math.min(1, reverseSpeed / state.maxReverse);
      leanInput = -GROUND_LEAN * factor;
    }
    const k = Math.min(1, 12 * dt);
    state.lean += (leanInput - state.lean) * k;

    const T = state.scroll;
    const slope = (trackHeight(T + 1) - trackHeight(T - 1)) / 2;
    const slopeRot = Math.atan(slope);
    state.slopeRotVisual += (slopeRot - state.slopeRotVisual) * k;
    carPivot.rotation.z = state.slopeRotVisual + state.lean;
  }
}

function updateSuspension(dt) {
  if (!state.suspensionEnabled) {
    state.suspY = 0;
    state.suspVy = 0;
    state.prevTrackH = trackHeight(state.scroll);
    bodyGroup.position.y = 0;
    for (const s of springs) {
      s.group.scale.y = 1;
      for (const ring of s.rings) ring.scale.y = 1;
    }
    return;
  }

  const tH = trackHeight(state.scroll);

  if (state.airborne) {
    const decay = Math.max(0, 1 - 7 * dt);
    state.suspY *= decay;
    state.suspVy *= decay;
  } else {
    const groundDelta = tH - state.prevTrackH;
    state.suspY -= groundDelta;

    state.suspVy -= SUSP_K * state.suspY * dt;
    state.suspVy *= Math.max(0, 1 - SUSP_DAMP * dt);
    state.suspY += state.suspVy * dt;

    if (state.suspY > SUSP_MAX_EXTEND) {
      state.suspY = SUSP_MAX_EXTEND;
      if (state.suspVy > 0) state.suspVy = 0;
    }
    if (state.suspY < -SUSP_MAX_COMPRESS) {
      state.suspY = -SUSP_MAX_COMPRESS;
      if (state.suspVy < 0) state.suspVy = 0;
    }
  }

  state.prevTrackH = tH;

  bodyGroup.position.y = state.suspY;

  const factor = Math.max(0.25, 1 + state.suspY / SUSP_REST);
  for (const s of springs) {
    s.group.scale.y = factor;
    for (const ring of s.rings) ring.scale.y = 1 / factor;
  }
}

function updateCarVisual(dt) {
  carPivot.position.x = 0;
  const cosR = Math.cos(carPivot.rotation.z);
  const wheelLift = Math.max(0, cosR) * 0.5 * (1 - cosR);
  carPivot.position.y = state.y + CAR_HALF_HEIGHT + wheelLift;
  const wheelSpin = -state.speed * dt * 2.3;
  for (const w of wheels) w.rotation.y += wheelSpin;
}

function updateCamera(dt) {
  const k = Math.min(1, CAM_FOLLOW_LERP * 60 * dt);
  const targetY = carPivot.position.y + CAM_Y_OFFSET;
  camera.position.y += (targetY - camera.position.y) * k;
  camera.lookAt(0, camera.position.y - CAM_LOOK_Y_OFFSET, 0);
}

function updateBot(dt) {
  if (!state.raceStarted || state.raceFinished) return;
  state.botTurboCycle = (state.botTurboCycle + dt) % BOT_CYCLE;
  state.botTurboActive = state.botTurboCycle < BOT_TURBO_ON;
  const spd = BOT_BASE_SPEED * (state.botTurboActive ? BOT_TURBO_MULT : 1);
  const prevBotScroll = state.botScroll;
  state.botScroll = Math.min(state.botScroll + spd * dt, FINISH_LINE_X);
  if (prevBotScroll < FINISH_LINE_X && state.botScroll >= FINISH_LINE_X) {
    state.botFinishTime = state.raceTime;
  }
  raceBarBotEl.style.left = ((state.botScroll / FINISH_LINE_X) * 100).toFixed(1) + '%';
  raceBarBotEl.style.boxShadow = state.botTurboActive ? '0 0 10px #ff4444, 0 0 20px #ff8800' : '0 0 6px #ff4444';
}

function updateScrollVisuals(dt) {
  const dx = state.speed * dt;
  grid.position.x -= dx;

  const finishRelX = FINISH_LINE_X - state.scroll;
  finishLineMesh.position.x = finishRelX;
  const finishH = trackHeight(state.scroll + finishRelX);
  finishLineMesh.position.y = finishH;
}

const SKY_SCROLL_PERIOD = 3000;
const SKY_ORBIT_RADIUS = 20;
const SKY_ORBIT_ARC = Math.PI * 0.4;
function updateSky() {
  const angle = (state.scroll / SKY_SCROLL_PERIOD) * SKY_ORBIT_ARC;
  skyCamera.position.set(
    Math.sin(angle) * SKY_ORBIT_RADIUS,
    8,
    Math.cos(angle) * SKY_ORBIT_RADIUS
  );
  skyCamera.lookAt(0, 0, -8);
}

function fuelBarText(fuel) {
  const N = 12;
  const filled = Math.round(fuel * N);
  return '[' + '\u2588'.repeat(filled) + '\u2591'.repeat(N - filled) + ']';
}

const posWrapEl = document.getElementById('hud-pos');
const posValEl = document.getElementById('pos');

function updateHUD() {
  speedEl.textContent = Math.round(state.speed * 3.6 * 2.5);
  distEl.textContent = Math.round(state.scroll);
  if (fuelEl) {
    fuelEl.textContent = fuelBarText(state.fuel);
    fuelEl.style.color = state.turboActive ? '#ff8a3a'
                       : state.fuel < 0.2  ? '#ff5555'
                       : '#ffd86b';
  }
  if (state.gridVisible && posValEl) posValEl.textContent = Math.round(state.scroll);

  if (state.raceStarted && !state.raceFinished) {
    if (botDistEl) botDistEl.textContent = Math.round(state.botScroll);
    const playerProgress = Math.min(state.scroll / FINISH_LINE_X, 1);
    raceBarPlayerEl.style.left = (playerProgress * 100).toFixed(1) + '%';
  }
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  updateCountdown(dt);

  if (state.crashed) {
    state.crashTimer += dt;
    crashFadeEl.style.opacity = '1';
    if (state.crashTimer >= CRASH_AUTO_RESET) resetGame();
    updateHUD();
    renderer.autoClear = true;
    renderer.render(skyScene, skyCamera);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(scene, camera);
    renderer.autoClear = true;
    requestAnimationFrame(tick);
    return;
  }

  if (state.crashSettling) {
    state.crashSettleTimer += dt;
    const fade = Math.min(1, state.crashSettleTimer / CRASH_SETTLE_DURATION);
    crashFadeEl.style.opacity = fade.toFixed(3);
    if (state.crashSettleTimer >= CRASH_SETTLE_DURATION) {
      finalizeCrash();
      updateHUD();
      renderer.autoClear = true;
      renderer.render(skyScene, skyCamera);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.autoClear = true;
      requestAnimationFrame(tick);
      return;
    }
  }

  if (state.raceStarted && !state.raceFinished) {
    state.raceTime += dt;
    updateBot(dt);

    if (state.botScroll >= FINISH_LINE_X && state.scroll < FINISH_LINE_X && !state.botWon) {
      showDefeatScreen();
    }

    if (state.botWon && !state.raceFinished) {
      endPlayerTimeEl.textContent = state.raceTime.toFixed(1) + 's';
    }

    if (state.scroll >= FINISH_LINE_X) {
      showEndScreen(!state.botWon);
    }
  }

  if (!state.crashSettling) updateTurbo(dt);
  updateSpeed(dt);
  updatePhysics(dt);
  updateRotation(dt);
  updateSuspension(dt);
  updateCarVisual(dt);
  const smokeIntensity = (state.turboActive && keys.up) ? 3 : keys.up ? 2 : 1;
  const isTurbulent = state.airborne || Math.abs(state.angVel) > 2.0;
  carBuilt.updateSmoke(dt, smokeIntensity, state.speed, isTurbulent);
  engineSound.update(state.speed, state.turboActive, state.maxSpeedNormal);
  updateCamera(dt);
  updateScrollVisuals(dt);
  updateSky();
  deformRoad();
  deformMud();
  mudTex.offset.x = state.scroll / 8;
  jungleRoadTex.offset.x = state.scroll / 10;
  updateHUD();

  renderer.autoClear = true;
  renderer.render(skyScene, skyCamera);
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(scene, camera);
  renderer.autoClear = true;
  requestAnimationFrame(tick);
}
initLobby((carFactory) => {
  if (carFactory !== makeCar) {
    carPivot.remove(carBuilt.group);
    carBuilt = carFactory();
    flame = carBuilt.flame;
    wheels = carBuilt.wheels;
    bodyGroup = carBuilt.bodyGroup;
    springs = carBuilt.springs;
    carHeadlight = carBuilt.headlight;
    hitboxDebug = carBuilt.hitboxDebug;
    carPivot.add(carBuilt.group);
  }
  last = performance.now();
  startCountdown();
  requestAnimationFrame(tick);
});

window.addEventListener('resize', () => {
  aspect = window.innerWidth / window.innerHeight;
  camera.left = -aspect * VIEW_H;
  camera.right = aspect * VIEW_H;
  camera.top = VIEW_H;
  camera.bottom = -VIEW_H;
  camera.updateProjectionMatrix();
  skyCamera.aspect = window.innerWidth / window.innerHeight;
  skyCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
