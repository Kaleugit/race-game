/**
 * @module main
 * @summary Game entry point: renderer, car visuals, input, race loop, HUD and the race/result flow.
 * Stage chosen on the map (src/lobby.js) or via the ?stage=<id> test shortcut; the player car uses the
 * garage saved in the profile (src/profile/profile.js): all five parts (tire, gearbox, engine, chassis,
 * turbo tank) feed resolveCarParams, the engine picks the sound variant and the tank sizes the turbo gauge.
 * HUD gauges (speed, turbo, DIST) and the race-bar 1º/2º badges are drawn by src/ui/race-hud.js.
 * Car physics lives in src/physics/car-physics.js (playerCar); this file only renders its state.
 * The opponent is a second physics instance (botCar) driven by src/bot/bot-driver.js; its position
 * feeds the race bar (mini-map with the stage name) and, when the BOT FANTASMA option of the map
 * screen is on, a translucent ghost mesh (src/bot/ghost-car.js) that only reads the bot state.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makeSkyTexture, makeMountainTexture, makeHillTexture } from './textures.js';
import { getDefaultStage, getStage, listStages } from './stages/index.js';
import { createTrack } from './track/track.js';
import { createTrackScene } from './track/track-scene.js';
import { initLobby } from './lobby.js';
import { makeCar, applyCarLook, SUSP_REST } from './car.js';
import { createCarPhysics } from './physics/car-physics.js';
import { BASE_PARAMS } from './physics/params.js';
import { resolveCarParams } from './parts/presets.js';
import { createProfile } from './profile/profile.js';
import { showResult, hideResult } from './ui/result.js';
import { createRaceHud, playerLeads } from './ui/race-hud.js';
import { initEngineSound } from './sound.js';
import { createBotDriver, runBotToFinish } from './bot/bot-driver.js';
import { resolveBotParams, BOT_DEFAULT_PARTS } from './bot/bot-preset.js';
import { createGhostCar } from './bot/ghost-car.js';

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

// Test shortcut: ?stage=<id> makes JOGAR skip garage/map (unknown id -> default stage + warning).
function stageIdFromUrl() {
  return new URLSearchParams(location.search).get('stage');
}

let track = null;
let trackScene = null;
let playerCar = null;
let currentStage = null;
// Bot opponent: rebuilt at the start of every race (resetGame); never added to the scene.
let botCar = null;
let botDriver = null;
let raceIndex = 0; // bot seed = session race counter (epic DA-005)
// Optional ghost mesh of the bot (EP-008-11): built on the first race that turns the option on.
let ghostCar = null;
// Local profile: saved garage + unlocked stages + best times.
const profile = createProfile(undefined, listStages());
let garage = profile.getGarage(); // snapshot taken at every race start (resetGame)
let playerParams = null; // resolved params of the current race (garage parts over BASE_PARAMS)
let menuOpen = true; // lobby/garage/map on screen: the race scene is not stepped nor rendered

function setStage(id) {
  let stage = id ? getStage(id) : null;
  if (!stage) {
    if (id) console.warn(`stage '${id}' not found, using default`);
    stage = getDefaultStage();
  }
  if (trackScene) trackScene.dispose();
  track = createTrack(stage);
  trackScene = createTrackScene({ scene, skyScene, stage, track });
  currentStage = stage;
  raceBarStageEl.textContent = String(stage.name ?? stage.id).toUpperCase();
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
// In-race buttons drop focus after a click, so Space (turbo) never re-presses them.
for (const btn of document.querySelectorAll('.race-btn')) btn.addEventListener('click', () => btn.blur());
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
  botFinishTime: null,
  botWon: false,
  playerFirst: true,
};

const engineSound = initEngineSound();

const countdownOverlayEl = document.getElementById('countdown-overlay');
const countdownNumEl = document.getElementById('countdown-num');
const btnRestartEl = document.getElementById('btn-restart');
btnRestartEl.addEventListener('click', () => {
  hideResult();
  startCountdown();
});

// In-race LOBBY button: back to the lobby home without reloading (overrides the inline handler).
const btnBackLobbyEl = document.getElementById('btn-back-lobby');
btnBackLobbyEl.onclick = () => leaveRace((l) => l.openHome());

// Race HUD gauges (EP-008-07); configured per race in resetGame, updated every frame in updateHUD.
const raceHud = createRaceHud();

// HUD notice while the bot has already crossed the line and the player is still racing.
const botWonNoticeEl = document.createElement('div');
botWonNoticeEl.id = 'hud-bot-won';
botWonNoticeEl.textContent = 'BOT CHEGOU — DERROTA';
botWonNoticeEl.style.display = 'none';
document.getElementById('hud').appendChild(botWonNoticeEl);

// Mini-map: the race bar carries the stage name under its track (styled by #race-bar-stage in index.html).
const raceBarStageEl = document.createElement('span');
raceBarStageEl.id = 'race-bar-stage';
document.getElementById('race-bar').appendChild(raceBarStageEl);

// BOT FANTASMA (EP-008-11): the ghost mesh is built on the first race that enables the option (never
// while it is off) and then only shown/hidden, so no race pays for a mesh it does not draw. It uses
// the bot tire look of the stage that built it; every stage runs BOT_DEFAULT_PARTS today.
function setUpGhost() {
  const on = profile.getSettings().ghostBot;
  if (on && !ghostCar) {
    const tire = (currentStage.bot?.parts ?? BOT_DEFAULT_PARTS).tire;
    ghostCar = createGhostCar({ scene, look: { tire } });
  }
  ghostCar?.setEnabled(on);
  // Same convention as the resolved parts: the HUD exposes the option so the e2e can read it.
  document.getElementById('hud').dataset.ghost = on ? 'on' : 'off';
}

function resetGame() {
  // Player car from the saved garage (params + look) at every race start (RF-008/009).
  garage = profile.getGarage();
  playerParams = resolveCarParams(BASE_PARAMS, garage);
  playerCar = createCarPhysics({ track, params: playerParams });
  // The HUD exposes the resolved parts (read by the parts e2e): tank size, total mass, engine sound.
  const hudData = document.getElementById('hud').dataset;
  hudData.turboCapacity = String(playerParams.turboCapacity);
  hudData.mass = String(playerParams.mass);
  hudData.engine = garage.engine;
  raceHud.configure({ turboCapacity: playerParams.turboCapacity, maxSpeedTurbo: playerParams.maxSpeedTurbo });
  applyCarLook(carBuilt, { color: garage.color, tire: garage.tire });
  state.bob = 0;
  state.raceStarted = false;
  state.raceFinished = false;
  state.raceTime = 0;
  raceIndex++;
  botCar = createCarPhysics({ track, params: resolveBotParams(currentStage) });
  botDriver = createBotDriver({ track, difficulty: currentStage.bot.difficulty, seed: raceIndex });
  state.botScroll = 0;
  state.botFinishTime = null;
  state.playerFirst = true; // grid order until someone is ahead (EP-008-10)
  raceHud.setPositions(true);
  setUpGhost();
  renderBotBar();
  state.botWon = false;
  botWonNoticeEl.style.display = 'none';
  state.inputFrozen = true;
  carPivot.rotation.z = 0;
  carPivot.position.set(0, CAR_HALF_HEIGHT, 0);
  bodyGroup.position.y = 0;
  flame.visible = false;
  hideResult();
  if (btnRestartEl) btnRestartEl.style.display = 'none';
}

// Stage chosen on the map (or via ?stage=): build the track and start the countdown.
function startRace(stageId) {
  setStage(stageId);
  menuOpen = false;
  last = performance.now();
  startCountdown();
}

// Leave the race scene for the lobby screens (result MAPA/GARAGEM, in-race LOBBY).
function leaveRace(open) {
  state.raceStarted = false;
  state.inputFrozen = true;
  engineSound.stop();
  countdownOverlayEl.classList.remove('show');
  hideResult();
  raceBarEl.classList.remove('show');
  btnBackLobbyEl.style.display = 'none';
  btnRestartEl.style.display = 'none';
  botWonNoticeEl.style.display = 'none';
  menuOpen = true;
  open(lobby);
}

// Pre-race countdown (EP-008-10): 1 s in total — "1", then a short "VAI!" beat, then control.
const COUNTDOWN_S = 1;
const COUNTDOWN_GO_AT_S = 0.6;
let countdownTimer = 0;

function startCountdown() {
  resetGame();
  engineSound.start();
  countdownTimer = 0;
  countdownNumEl.textContent = '1';
  countdownOverlayEl.classList.add('show');
}

function updateCountdown(dt) {
  if (!countdownOverlayEl.classList.contains('show')) return;
  countdownTimer += dt;
  if (countdownTimer >= COUNTDOWN_GO_AT_S && countdownNumEl.textContent !== 'VAI!') {
    countdownNumEl.textContent = 'VAI!';
  }
  if (countdownTimer >= COUNTDOWN_S) {
    countdownOverlayEl.classList.remove('show');
    state.inputFrozen = false;
    state.raceStarted = true;
    btnBackLobbyEl.style.display = 'block';
    btnRestartEl.style.display = 'block';
    raceBarEl.classList.add('show');
  }
}

// Bot crossed first: HUD notice only; the result opens when the player crosses the line.
function showBotWonNotice() {
  state.botWon = true;
  botWonNoticeEl.style.display = '';
}

// Player crossed the line: record the win in the profile and open the result screen.
function finishRace(playerWon) {
  state.raceFinished = true;
  state.inputFrozen = true;
  engineSound.stop();
  botWonNoticeEl.style.display = 'none';
  const stageId = currentStage.id;
  let bestTime = profile.getBest(stageId);
  let isNewBest = false;
  if (playerWon) {
    const rec = profile.recordWin(stageId, state.raceTime);
    bestTime = rec.best;
    isNewBest = rec.isNewBest;
  }
  showResult({
    won: playerWon,
    playerTime: state.raceTime,
    botTime: state.botFinishTime,
    bestTime,
    isNewBest,
    onRematch: () => startCountdown(), // same stage, new bot seed
    onMap: () => leaveRace((l) => l.openMap()),
    onGarage: () => leaveRace((l) => l.openGarage()),
  });
}

const suspEl = document.getElementById('suspstate');
const infTurboEl = document.getElementById('infturbo');
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

// Race-bar marker for the bot: position from botCar.state.x, turbo glow from botCar.state.turboActive.
function renderBotBar() {
  const progress = Math.min(Math.max(state.botScroll / track.finishX, 0), 1);
  raceBarBotEl.style.left = (progress * 100).toFixed(1) + '%';
  raceBarBotEl.style.boxShadow = botCar.state.turboActive ? '0 0 10px #ff4444, 0 0 20px #ff8800' : '0 0 6px #ff4444';
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

const posWrapEl = document.getElementById('hud-pos');
const posValEl = document.getElementById('pos');

function updateHUD() {
  const car = playerCar.state;
  raceHud.update(car);
  if (state.gridVisible && posValEl) posValEl.textContent = Math.round(car.x);

  if (state.raceStarted && !state.raceFinished) {
    state.playerFirst = playerLeads(state.playerFirst, car.x, state.botScroll, track.finishX);
    raceHud.setPositions(state.playerFirst);
    const playerProgress = Math.min(car.x / track.finishX, 1);
    raceBarPlayerEl.style.left = (playerProgress * 100).toFixed(1) + '%';
  }
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (menuOpen) { requestAnimationFrame(tick); return; }

  updateCountdown(dt);

  if (state.raceStarted && !state.raceFinished) {
    state.raceTime += dt;
    if (state.botFinishTime == null) {
      botCar.step(dt, botDriver.decide(botCar.state, dt));
      state.botScroll = Math.min(botCar.state.x, track.finishX);
      if (botCar.state.x >= track.finishX) state.botFinishTime = state.raceTime;
      renderBotBar();
    }

    if (state.botScroll >= track.finishX && playerCar.state.x < track.finishX && !state.botWon) {
      showBotWonNotice();
    }

    if (playerCar.state.x >= track.finishX) {
      if (state.botFinishTime == null) {
        // Player finished first: simulate only the bot to the line for its real time (epic DA-002).
        state.botFinishTime = runBotToFinish({ car: botCar, driver: botDriver, track, startTime: state.raceTime });
      }
      finishRace(!state.botWon);
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
  // Ghost opponent: reads botCar.state only (no collision, no physics); culled off-screen.
  ghostCar?.update(botCar.state, car.x, dt, camera.right);
  const smokeIntensity = (car.turboActive && keys.up) ? 3 : keys.up ? 2 : 1;
  const isTurbulent = car.airborne || Math.abs(car.angVel) > 2.0;
  carBuilt.updateSmoke(dt, smokeIntensity, car.speed, isTurbulent);
  engineSound.update(dt, { speed: car.speed, throttle: keys.up, airborne: car.airborne, turboActive: car.turboActive, gearboxPreset: garage.gearbox, engine: garage.engine });
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
const lobby = initLobby({
  profile,
  stages: listStages(),
  testStageId: stageIdFromUrl(),
  onStart: (stageId, carFactory) => {
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
    startRace(stageId);
  },
});
requestAnimationFrame(tick);

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
