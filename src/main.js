/**
 * @module main
 * @summary Game entry point: renderer, car visuals, input, race loop, HUD; stage selected via ?stage=<id>.
 * Car physics lives in src/physics/car-physics.js (playerCar); this file only renders its state.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makeSkyTexture, makeMountainTexture, makeHillTexture } from './textures.js';
import { getDefaultStage, getStage } from './stages/index.js';
import { createTrack } from './track/track.js';
import { createTrackScene } from './track/track-scene.js';
import { initLobby } from './lobby.js';
import { makeCar, makeCarGLB, WHEEL_RADIUS, SUSP_REST, DEBUG_CRASH_HITBOX } from './car.js';
import { createCarPhysics } from './physics/car-physics.js';
import { BASE_PARAMS } from './physics/params.js';
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

const CAR_HALF_HEIGHT = BASE_PARAMS.CAR_HALF_HEIGHT;

const GRID_SIZE = 200;
const GRID_DIV = 20;

const skyScene = new THREE.Scene();
skyScene.add(new THREE.AmbientLight(0xffffff, 1.5));
const skyCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
skyCamera.position.set(0, 4, 12);
skyCamera.lookAt(0, 0, -8);

const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIV, 0x888888, 0x444444);
grid.position.set(0, 0, 0);
grid.visible = false;
scene.add(grid);

// Stage selection: ?stage=<id> (unknown or absent id -> default stage).
function stageIdFromUrl() {
  return new URLSearchParams(location.search).get('stage');
}

let track = null;
let trackScene = null;
let playerCar = null;

function setStage(id) {
  let stage = id ? getStage(id) : null;
  if (!stage) {
    if (id) console.warn(`stage '${id}' not found, using default`);
    stage = getDefaultStage();
  }
  if (trackScene) trackScene.dispose();
  track = createTrack(stage);
  trackScene = createTrackScene({ scene, skyScene, stage, track });
  playerCar = createCarPhysics({ track, params: BASE_PARAMS });
  return stage;
}

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
  bob: 0,
  suspensionEnabled: true,
  infiniteTurbo: false,
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

// BOT: base ~19 m/s, turbo 1.7× for 2.5s every 7s cycle → avg ≈ 23.8 m/s → 620m / 23.8 ≈ 26s
const BOT_BASE_SPEED   = 19;
const BOT_TURBO_MULT   = 1.7;
const BOT_CYCLE        = 7.0;
const BOT_TURBO_ON     = 2.5;

const engineSound = initEngineSound();

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

function resetGame() {
  playerCar.reset();
  state.bob = 0;
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


// Flame/headlight from physics turbo state.
function renderTurbo() {
  const car = playerCar.state;
  flame.visible = car.turboActive;
  if (car.turboActive) {
    flame.scale.set(0.85 + Math.random() * 0.4, 0.85 + Math.random() * 0.3, 0.85 + Math.random() * 0.3);
  }
  carHeadlight.intensity = car.turboActive ? 1.6 : 0.7;
}

// Body offset and spring stretch from physics suspension state (suspY is 0 when disabled).
function renderSuspension() {
  const car = playerCar.state;
  bodyGroup.position.y = car.suspY;
  const factor = Math.max(0.25, 1 + car.suspY / SUSP_REST);
  for (const s of springs) {
    s.group.scale.y = factor;
    for (const ring of s.rings) ring.scale.y = 1 / factor;
  }
}

function updateCarVisual(dt) {
  const car = playerCar.state;
  carPivot.rotation.z = car.rot;
  carPivot.position.x = 0;
  const cosR = Math.cos(carPivot.rotation.z);
  const wheelLift = Math.max(0, cosR) * 0.5 * (1 - cosR);
  carPivot.position.y = car.y + CAR_HALF_HEIGHT + wheelLift;
  const wheelSpin = -car.speed * dt * 2.3;
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
  state.botScroll = Math.min(state.botScroll + spd * dt, track.finishX);
  if (prevBotScroll < track.finishX && state.botScroll >= track.finishX) {
    state.botFinishTime = state.raceTime;
  }
  raceBarBotEl.style.left = ((state.botScroll / track.finishX) * 100).toFixed(1) + '%';
  raceBarBotEl.style.boxShadow = state.botTurboActive ? '0 0 10px #ff4444, 0 0 20px #ff8800' : '0 0 6px #ff4444';
}

function updateScrollVisuals(dt) {
  const dx = playerCar.state.speed * dt;
  grid.position.x -= dx;
}

const SKY_SCROLL_PERIOD = 3000;
const SKY_ORBIT_RADIUS = 20;
const SKY_ORBIT_ARC = Math.PI * 0.4;
function updateSky() {
  const angle = (playerCar.state.x / SKY_SCROLL_PERIOD) * SKY_ORBIT_ARC;
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
  const car = playerCar.state;
  speedEl.textContent = Math.round(car.speed * 3.6 * 2.5);
  distEl.textContent = Math.round(car.x);
  if (fuelEl) {
    fuelEl.textContent = fuelBarText(car.fuel);
    fuelEl.style.color = car.turboActive ? '#ff8a3a'
                       : car.fuel < 0.2  ? '#ff5555'
                       : '#ffd86b';
  }
  if (state.gridVisible && posValEl) posValEl.textContent = Math.round(car.x);

  if (state.raceStarted && !state.raceFinished) {
    if (botDistEl) botDistEl.textContent = Math.round(state.botScroll);
    const playerProgress = Math.min(car.x / track.finishX, 1);
    raceBarPlayerEl.style.left = (playerProgress * 100).toFixed(1) + '%';
  }
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  updateCountdown(dt);

  if (state.raceStarted && !state.raceFinished) {
    state.raceTime += dt;
    updateBot(dt);

    if (state.botScroll >= track.finishX && playerCar.state.x < track.finishX && !state.botWon) {
      showDefeatScreen();
    }

    if (state.botWon && !state.raceFinished) {
      endPlayerTimeEl.textContent = state.raceTime.toFixed(1) + 's';
    }

    if (playerCar.state.x >= track.finishX) {
      showEndScreen(!state.botWon);
    }
  }

  const car = playerCar.state;
  car.suspensionEnabled = state.suspensionEnabled;
  car.infiniteTurbo = state.infiniteTurbo;
  // Chassis contact no longer ends the race: the car rests and auto-rights (RF-005).
  playerCar.step(dt, { ...keys, locked: state.inputFrozen });
  renderTurbo();
  renderSuspension();
  updateCarVisual(dt);
  const smokeIntensity = (car.turboActive && keys.up) ? 3 : keys.up ? 2 : 1;
  const isTurbulent = car.airborne || Math.abs(car.angVel) > 2.0;
  carBuilt.updateSmoke(dt, smokeIntensity, car.speed, isTurbulent);
  engineSound.update(car.speed, car.turboActive, BASE_PARAMS.maxSpeedNormal);
  updateCamera(dt);
  updateScrollVisuals(dt);
  updateSky();
  trackScene.update(car.x);
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
  setStage(stageIdFromUrl());
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
