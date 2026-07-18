import * as THREE from 'three';
import { makeCar } from './car.js';

const CARS = [
  { name: 'BANDEIRANTE', factory: makeCar },
];

export function initLobby(onPlay) {
  const lobbyEl = document.getElementById('lobby');
  const canvas = document.getElementById('lobby-canvas');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const VIEW_H = 2.8;
  let aspect = lobbyEl.clientWidth / lobbyEl.clientHeight;
  const camera = new THREE.OrthographicCamera(
    -aspect * VIEW_H, aspect * VIEW_H, VIEW_H, -VIEW_H, 0.1, 200
  );
  camera.position.set(0, 1, 14);
  camera.lookAt(0, 1.1, 0);

  const scene = new THREE.Scene();

  const ambient = new THREE.AmbientLight(0x6478a8, 0.55);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffd6a8, 1.4);
  sun.position.set(-8, 12, 8);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xff7a4a, 0.5);
  rim.position.set(15, 4, -10);
  scene.add(rim);

  let currentCarGroup = null;
  let builtCar = null;

  function spawnCar() {
    if (currentCarGroup) scene.remove(currentCarGroup);
    builtCar = CARS[0].factory();
    currentCarGroup = builtCar.group;
    scene.add(currentCarGroup);
  }

  spawnCar();

  function resize() {
    const w = lobbyEl.clientWidth;
    const h = lobbyEl.clientHeight;
    renderer.setSize(w, h);
    aspect = w / h;
    camera.left   = -aspect * VIEW_H;
    camera.right  =  aspect * VIEW_H;
    camera.top    =  VIEW_H;
    camera.bottom = -VIEW_H;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let isDragging = false;
  let lastPointerX = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let isZoomed = false;
  let targetZoom = 1;
  let currentZoom = 1;
  let targetLookY = 1.1;
  let currentLookY = 1.1;
  const DRAG_THRESHOLD = 6;

  const lobbyUi = document.getElementById('lobby-ui');
  const fsWrap  = document.getElementById('lobby-fullscreen-wrap');

  // hint shown in zoom mode
  function enterZoom() {
    isZoomed = true;
    targetZoom = 1.70;
    targetLookY = 0.1;
    lobbyUi.style.transition = 'opacity 0.3s';
    lobbyUi.style.opacity = '0';
    lobbyUi.style.pointerEvents = 'none';
    fsWrap.style.transition = 'opacity 0.3s';
    fsWrap.style.opacity = '0';
    fsWrap.style.pointerEvents = 'none';
  }

  function exitZoom() {
    isZoomed = false;
    targetZoom = 1;
    targetLookY = 1.1;
    lobbyUi.style.opacity = '1';
    lobbyUi.style.pointerEvents = '';
    fsWrap.style.opacity = '1';
    fsWrap.style.pointerEvents = '';
  }

  lobbyEl.style.touchAction = 'none';
  canvas.style.touchAction = 'none';

  const raycaster = new THREE.Raycaster();
  const ndcMouse = new THREE.Vector2();

  function hitsCar(clientX, clientY) {
    if (!currentCarGroup) return false;
    const rect = canvas.getBoundingClientRect();
    ndcMouse.set(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      ((clientY - rect.top)  / rect.height) * -2 + 1,
    );
    raycaster.setFromCamera(ndcMouse, camera);
    return raycaster.intersectObject(currentCarGroup, true).length > 0;
  }

  let pointerOnCar = false;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = false;
    lastPointerX = e.clientX;
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
    pointerOnCar = hitsCar(e.clientX, e.clientY);
  });
  window.addEventListener('pointermove', (e) => {
    const dx = e.clientX - pointerDownX;
    const dy = e.clientY - pointerDownY;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) isDragging = true;
    if (!isDragging || !currentCarGroup) return;
    currentCarGroup.rotation.y += (e.clientX - lastPointerX) * 0.01;
    lastPointerX = e.clientX;
  });
  window.addEventListener('pointerup', () => {
    const wasDrag = isDragging;
    const onCar = pointerOnCar;
    isDragging = false;
    pointerOnCar = false;
    if (!wasDrag) {
      if (isZoomed) exitZoom();
      else if (onCar) enterZoom();
    }
  });
  window.addEventListener('pointercancel', () => { isDragging = false; pointerOnCar = false; });

  let rafId = null;
  let lastTime = performance.now();

  function animate(now) {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    currentZoom += (targetZoom - currentZoom) * 0.08;
    currentLookY += (targetLookY - currentLookY) * 0.08;
    camera.zoom = currentZoom;
    camera.updateProjectionMatrix();
    camera.lookAt(0, currentLookY, 0);
    if (builtCar) builtCar.updateSmoke(dt, 1);
    renderer.render(scene, camera);
  }

  rafId = requestAnimationFrame(animate);

  // background music
  const music = new Audio('/music/Jungle Love 174BPM Dubmatix Bass Culture (lower key).mp3');
  music.loop = true;
  music.volume = 0.55;
  let muted = false;

  const muteBtn = document.getElementById('lobby-mute');
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    music.muted = muted;
    muteBtn.textContent = muted ? '🔇' : '🔊';
  });

  // autoplay requires user gesture — start on first pointer interaction
  let musicStarted = false;
  function startMusic() {
    if (musicStarted) return;
    musicStarted = true;
    music.play().catch(() => {});
  }
  lobbyEl.addEventListener('pointerdown', startMusic, { once: false });
  // also try immediately (works if autoplay policy allows)
  music.play().then(() => { musicStarted = true; }).catch(() => {});

  const playBtn = document.getElementById('lobby-play');
  playBtn.addEventListener('click', () => {
    music.pause();
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    lobbyEl.style.display = 'none';
    onPlay(CARS[0].factory);
  });
}
