/**
 * @module sound
 * @summary Web Audio engine sound synthesized from engine orders (EP-007).
 * Consumes the pure engine model (src/audio/engine-model.js): oscillators at engine orders 0.5, 1,
 * 2 and 4 of the crank frequency with light detune, per-order gains driven by load, a lowpass that
 * tracks RPM and load, a light combustion-noise layer amplitude-modulated at the firing frequency,
 * turbo hiss/whine while the turbo is on and a blow-off when it is released.
 * The RF-012 engine preset changes the model's RPM range (ENGINES[id].sound) and the synth
 * brightness (ENGINES[id].timbre): 2.4 brighter and higher-revving, 1.6 deeper (EP-008-08).
 */
import { createEngineModel, ENGINE_DEFAULTS } from './audio/engine-model.js';
import { ENGINES } from './parts/presets.js';

// Engine orders relative to the crank frequency (rpm / 60). Order 2 = firing frequency of a
// 4-cylinder 4-stroke (27-133 Hz). `detune` is in cents; `idle`/`load` are the order gain without
// and with full load. `hi` scales the load share with RPM (higher orders open up at high RPM).
const ORDERS = [
  { order: 0.5, type: 'sine', detune: -6, idle: 0.30, load: 0.10, hi: 0 },
  { order: 1, type: 'triangle', detune: 4, idle: 0.32, load: 0.18, hi: 0 },
  { order: 2, type: 'sawtooth', detune: 0, idle: 0.38, load: 0.34, hi: 0.2 },
  { order: 2, type: 'sawtooth', detune: 7, idle: 0.12, load: 0.14, hi: 0.2 },
  { order: 4, type: 'sawtooth', detune: -5, idle: 0.03, load: 0.14, hi: 0.8 },
];

const MASTER_LEVEL = 0.28;
// Smoothing time constants (s). Pitch follows fast so the ratio drop on a shift is audible as a
// quick step; gains and filter follow a little slower so the zero-load shift gap sounds like a
// clutch dip rather than a click.
const PITCH_TAU = 0.025;
const GAIN_TAU = 0.04;
const FILTER_TAU = 0.05;

function makeNoiseBuffer(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Creates the engine sound. `start()` opens/resumes the AudioContext, resets the engine model and
 * fades in; `update(dt, { speed, throttle, airborne, turboActive, gearboxPreset, engine })` advances the
 * engine model one frame and retunes the synth (no-op until started); `stop()` fades out.
 * `gearboxPreset` is the EP-003 gearbox id (`curta`/`padrao`/`longa`) and `engine` the RF-012
 * engine id (`e16`/`e20`/`e24`); changing either rebuilds the engine model.
 * @summary Build the engine sound: `{ start, update, stop }`.
 * @returns {{ start: () => void, update: (dt: number, input: object) => void, stop: () => void }}
 */
export function initEngineSound() {
  let ctx = null;
  let masterGain, shaper, filter;
  let voices = [];
  let combGain, combMod, combModDepth, combBp;
  let turboGain, turboBp, turboWhine, turboWhineGain;
  let running = false;
  let prevTurboActive = false;
  let preset = ENGINE_DEFAULTS.gearboxPreset;
  let engineId = ENGINE_DEFAULTS.engine;
  let engine = createEngineModel({ gearboxPreset: preset, engine: engineId });
  let timbre = ENGINES[engineId].timbre;

  function ensureContext() {
    if (ctx) return;
    ctx = new AudioContext();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    // Soft saturation: adds the harmonics a diesel's pressure pulses have without a buzzy edge.
    shaper = ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / curve.length - 1;
      curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 250;
    filter.Q.value = 1.1;
    shaper.connect(filter);
    filter.connect(masterGain);

    voices = ORDERS.map((o) => {
      const osc = ctx.createOscillator();
      osc.type = o.type;
      osc.detune.value = o.detune;
      const gain = ctx.createGain();
      gain.gain.value = o.idle;
      osc.connect(gain);
      gain.connect(shaper);
      osc.start();
      return { ...o, osc, gain };
    });

    // Combustion noise: band-limited noise whose amplitude pulses at the firing frequency
    // (gain = level + level * sin(2*pi*firingHz*t), i.e. 0..2*level).
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, 2);
    noise.loop = true;
    combBp = ctx.createBiquadFilter();
    combBp.type = 'bandpass';
    combBp.frequency.value = 500;
    combBp.Q.value = 0.8;
    combGain = ctx.createGain();
    combGain.gain.value = 0.02;
    combMod = ctx.createOscillator();
    combMod.type = 'sine';
    combMod.frequency.value = 27;
    combModDepth = ctx.createGain();
    combModDepth.gain.value = 0.02;
    combMod.connect(combModDepth);
    combModDepth.connect(combGain.gain);
    noise.connect(combBp);
    combBp.connect(combGain);
    combGain.connect(filter);

    // Turbo: wide-band hiss plus a quiet whine, both only while the turbo is on.
    const turboNoise = ctx.createBufferSource();
    turboNoise.buffer = makeNoiseBuffer(ctx, 2);
    turboNoise.loop = true;
    turboBp = ctx.createBiquadFilter();
    turboBp.type = 'bandpass';
    turboBp.frequency.value = 1100;
    turboBp.Q.value = 0.7;
    turboGain = ctx.createGain();
    turboGain.gain.value = 0;
    turboNoise.connect(turboBp);
    turboBp.connect(turboGain);
    turboGain.connect(masterGain);
    turboWhine = ctx.createOscillator();
    turboWhine.type = 'sine';
    turboWhine.frequency.value = 2200;
    turboWhineGain = ctx.createGain();
    turboWhineGain.gain.value = 0;
    turboWhine.connect(turboWhineGain);
    turboWhineGain.connect(masterGain);

    noise.start();
    combMod.start();
    turboNoise.start();
    turboWhine.start();
  }

  function start() {
    ensureContext();
    ctx.resume();
    engine.reset();
    prevTurboActive = false;
    running = true;
    masterGain.gain.setTargetAtTime(MASTER_LEVEL, ctx.currentTime, 0.9);
  }

  function update(dt, { speed = 0, throttle = 0, airborne = false, turboActive = false, gearboxPreset, engine: nextEngine } = {}) {
    if (!running || !ctx) return;
    if ((gearboxPreset && gearboxPreset !== preset) || (nextEngine && nextEngine !== engineId)) {
      preset = gearboxPreset || preset;
      engineId = nextEngine || engineId;
      engine = createEngineModel({ gearboxPreset: preset, engine: engineId });
      timbre = ENGINES[engineId].timbre;
    }
    const { idleRpm, redlineRpm } = engine.config;
    const { rpm, load, firingHz } = engine.update(dt, { speed, throttle, airborne });
    const t = ctx.currentTime;
    const crankHz = rpm / 60;
    const rpmNorm = Math.min(1, Math.max(0, (rpm - idleRpm) / (redlineRpm - idleRpm)));

    for (const v of voices) {
      v.osc.frequency.setTargetAtTime(crankHz * v.order, t, PITCH_TAU);
      const g = v.idle + v.load * load * (1 - v.hi + v.hi * rpmNorm);
      v.gain.gain.setTargetAtTime(g, t, GAIN_TAU);
    }
    // Closed and muffled at idle / off-load, opens with RPM and much more with load.
    filter.frequency.setTargetAtTime(timbre * (160 + rpmNorm * 700 + load * (250 + rpmNorm * 900)), t, FILTER_TAU);

    combMod.frequency.setTargetAtTime(firingHz, t, PITCH_TAU);
    combBp.frequency.setTargetAtTime(timbre * (350 + rpmNorm * 700), t, FILTER_TAU);
    const combLevel = 0.015 + 0.05 * load;
    combGain.gain.setTargetAtTime(combLevel, t, GAIN_TAU);
    combModDepth.gain.setTargetAtTime(combLevel, t, GAIN_TAU);

    const boost = turboActive ? 0.4 + 0.6 * rpmNorm : 0;
    turboGain.gain.setTargetAtTime(0.06 * boost, t, 0.15);
    turboWhineGain.gain.setTargetAtTime(0.012 * boost, t, 0.15);
    turboWhine.frequency.setTargetAtTime(1800 + rpmNorm * 2600, t, 0.2);
    turboBp.frequency.setTargetAtTime(900 + rpmNorm * 800, t, 0.2);

    if (prevTurboActive && !turboActive && rpmNorm > 0.2) triggerBlowOff(rpmNorm);
    prevTurboActive = turboActive;
  }

  function triggerBlowOff(intensity) {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, 0.6);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1000 + intensity * 400;
    bp.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.setValueAtTime(2.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    src.connect(bp);
    bp.connect(g);
    g.connect(masterGain);
    src.start(t);
    src.stop(t + 0.6);
  }

  function stop() {
    if (!running || !ctx) return;
    running = false;
    prevTurboActive = false;
    engine.reset();
    turboGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    turboWhineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
  }

  return { start, update, stop };
}
