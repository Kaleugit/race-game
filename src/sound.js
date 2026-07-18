export function initEngineSound() {
  let ctx = null;
  let osc1, osc2, oscSub, filter, distortion, turboNoise, turboBp, turboGain, masterGain;
  let prevTurboActive = false;
  let running = false;
  let overdriveFreq = 0;
  let lastUpdateTime = 0;
  let virtualSf = 0;
  let prevGearIdx = 0;
  let shiftDip = 0;

  // fLow[n] = fHigh[n-1] + 5
  const GEARS = [
    { min: 0.00, max: 0.25, fLow:  50, fHigh:  90 },
    { min: 0.25, max: 0.50, fLow:  95, fHigh: 120 },
    { min: 0.50, max: 0.75, fLow: 125, fHigh: 148 },
    { min: 0.75, max: 1.00, fLow: 153, fHigh: 175 },
  ];

  function ensureContext() {
    if (ctx) return;
    ctx = new AudioContext();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 120) * x / (Math.PI + 120 * Math.abs(x));
    }
    shaper.curve = curve;
    shaper.oversample = '2x';

    oscSub = ctx.createOscillator();
    oscSub.type = 'sawtooth';
    const subGain = ctx.createGain();
    subGain.gain.value = 0.45;
    oscSub.connect(subGain);

    osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 1.8;

    subGain.connect(shaper);
    osc1.connect(shaper);
    osc2.connect(shaper);
    shaper.connect(filter);
    filter.connect(masterGain);

    // turbo "shhhhh" — looping white noise through wide bandpass
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
    turboNoise = ctx.createBufferSource();
    turboNoise.buffer = noiseBuf;
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

    oscSub.start();
    osc1.start();
    osc2.start();
    turboNoise.start();
  }

  function start() {
    ensureContext();
    ctx.resume();
    running = true;
    masterGain.gain.setTargetAtTime(0.28, ctx.currentTime, 0.9);
  }

  function update(speed, turboActive, maxSpeed) {
    if (!running || !ctx) return;
    const t = ctx.currentTime;
    const dt = lastUpdateTime > 0 ? Math.min(0.05, t - lastUpdateTime) : 0;
    lastUpdateTime = t;
    const realSf = Math.max(0, Math.min(1, speed / maxSpeed));

    // virtualSf rises slowly (longer gears), falls fast on deceleration
    if (realSf > virtualSf) virtualSf = Math.min(realSf, virtualSf + dt * 0.125);
    else                    virtualSf = Math.max(realSf, virtualSf - dt * 3.0);
    const sf = virtualSf;

    const gearIdx = sf < 0.25 ? 0 : sf < 0.50 ? 1 : sf < 0.75 ? 2 : 3;
    const gear = GEARS[gearIdx];
    const gearSf = (sf - gear.min) / (gear.max - gear.min);
    const baseFreq = gear.fLow + gearSf * (gear.fHigh - gear.fLow);

    if (gearIdx > prevGearIdx) shiftDip = 45;
    prevGearIdx = gearIdx;
    shiftDip = Math.max(0, shiftDip - dt * 420);

    if (gearIdx === 3 && gearSf >= 0.98) {
      overdriveFreq = Math.min(25, overdriveFreq + dt * 2.5);
    } else {
      overdriveFreq = Math.max(0, overdriveFreq - dt * 8.0);
    }
    const freq = baseFreq - shiftDip + (gearIdx === 3 ? overdriveFreq : 0);

    osc1.frequency.setTargetAtTime(freq, t, 0.02);
    osc2.frequency.setTargetAtTime(freq + 1.5, t, 0.02);
    oscSub.frequency.setTargetAtTime(freq * 0.5, t, 0.02);
    filter.frequency.setTargetAtTime(200 + gearIdx * 150 + gearSf * 1000, t, 0.03);

    if (prevTurboActive && !turboActive && sf > 0.2) triggerBlowOff(sf);
    prevTurboActive = turboActive;
  }

  function triggerBlowOff(intensity) {
    const t = ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

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
    overdriveFreq = 0;
    lastUpdateTime = 0;
    virtualSf = 0;
    prevGearIdx = 0;
    shiftDip = 0;
    masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
  }

  return { start, update, stop };
}
