/**
 * @module ui/race-hud
 * @summary In-race HUD: semi-transparent speed and turbo gauges plus DIST / BOT readouts.
 * Builds the SVG gauges inside the static #hud markup of index.html (EP-008-07). The speed gauge is a
 * 240° arc with a needle and a digital km/h readout (#speed); the turbo gauge is a segmented arc with
 * round(12 x turboCapacity) segments of constant size, so a bigger tank is a visibly longer arc
 * (Pequeno 8, Médio 12, Grande 17). Per-frame updates only touch text, one transform, one
 * stroke-dashoffset and segment classes, and only when the shown value changes (no layout reads).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const KMH_PER_MS = 9; // same factor the HUD always used: m/s * 3.6 * 2.5
const SPEED_SWEEP = 240; // degrees, symmetric around 12 o'clock
const SPEED_R = 40;
const TURBO_R = 38;
const TURBO_SEG_DEG = 15;
const TURBO_GAP_DEG = 4;
/** Default-tank segment count (EP-008-04 turbo bar cells); scaled by the tank capacity. */
export const TURBO_BASE_SEGMENTS = 12;

function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}

// Point on a circle centred in the 100x100 viewBox; 0° = 12 o'clock, clockwise.
function polar(r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
}

function arcPath(r, from, to) {
  const [x0, y0] = polar(r, from);
  const [x1, y1] = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * @summary Segment count of the turbo gauge for a tank capacity (12 for the default tank).
 * @param {number} capacity resolved params.turboCapacity
 * @returns {number}
 */
export function turboSegments(capacity = 1) {
  return Math.max(1, Math.round(TURBO_BASE_SEGMENTS * capacity));
}

/**
 * @summary Speed-gauge full scale in km/h for a car: its turbo top speed rounded up to 50 km/h.
 * @param {number} maxSpeedTurbo resolved params.maxSpeedTurbo (m/s)
 * @returns {number}
 */
export function speedGaugeMax(maxSpeedTurbo) {
  return Math.max(100, Math.ceil((maxSpeedTurbo * KMH_PER_MS) / 50) * 50);
}

/**
 * @summary Builds the race HUD gauges inside #hud and returns its per-race / per-frame API.
 * @param {Document} [doc]
 * @returns {{ configure(opts: { turboCapacity: number, maxSpeedTurbo: number }): void,
 *   update(s: { speed: number, x: number, fuel: number, turboActive: boolean, turboLockout: boolean }): void,
 *   setBotDist(m: number): void }}
 */
export function createRaceHud(doc = document) {
  const speedSvg = doc.getElementById('speed-gauge');
  const turboSvg = doc.getElementById('turbo-gauge');
  const distEl = doc.getElementById('dist');
  const botDistEl = doc.getElementById('bot-dist');

  // Speed gauge: face, track, fill arc (pathLength 100 -> dashoffset = 100 - pct), ticks, needle, readout.
  el('circle', { class: 'g-face', cx: 50, cy: 50, r: 48.5 }, speedSvg);
  const half = SPEED_SWEEP / 2;
  const arcD = arcPath(SPEED_R, -half, half);
  el('path', { class: 'g-track', d: arcD }, speedSvg);
  const speedFill = el('path', { class: 'g-fill', d: arcD, pathLength: 100, 'stroke-dasharray': 100, 'stroke-dashoffset': 100 }, speedSvg);
  const ticks = el('g', { class: 'g-ticks' }, speedSvg);
  const needle = el('g', { class: 'g-needle', transform: `rotate(${-half} 50 50)` }, speedSvg);
  el('path', { d: 'M 48.6 52 L 50 13 L 51.4 52 Z' }, needle);
  el('circle', { class: 'g-hub', cx: 50, cy: 50, r: 3.2 }, speedSvg);
  const speedText = el('text', { id: 'speed', class: 'g-num', x: 50, y: 76 }, speedSvg);
  speedText.textContent = '0';
  el('text', { class: 'g-unit', x: 50, y: 87 }, speedSvg).textContent = 'km/h';

  // Turbo gauge: face + segment group rebuilt per tank; threshold tick = re-ignite level (EP-008-05).
  el('circle', { class: 'g-face', cx: 50, cy: 50, r: 48.5 }, turboSvg);
  const segGroup = el('g', { class: 'turbo-segs' }, turboSvg);
  const reignite = el('path', { class: 'turbo-reignite' }, turboSvg);
  const turboPct = el('text', { class: 'g-num turbo-pct', x: 50, y: 57 }, turboSvg);
  const turboLabel = el('text', { class: 'g-unit turbo-label', x: 50, y: 72 }, turboSvg);
  turboLabel.textContent = 'TURBO';

  let segs = [];
  let maxKmh = 400;
  const last = { kmh: -1, dist: -1, bot: -1, filled: -1, pct: -1, mode: '', turbo: null };

  function configure({ turboCapacity = 1, maxSpeedTurbo }) {
    maxKmh = speedGaugeMax(maxSpeedTurbo);
    ticks.replaceChildren();
    const step = 50;
    for (let v = 0; v <= maxKmh; v += step) {
      const deg = -half + (v / maxKmh) * SPEED_SWEEP;
      const major = v % 100 === 0;
      const [x0, y0] = polar(major ? 31 : 34, deg);
      const [x1, y1] = polar(36.5, deg);
      el('line', { class: major ? 'tick major' : 'tick', x1: x0.toFixed(2), y1: y0.toFixed(2), x2: x1.toFixed(2), y2: y1.toFixed(2) }, ticks);
      if (major && v > 0 && v < maxKmh) {
        const [tx, ty] = polar(24.5, deg);
        el('text', { class: 'tick-num', x: tx.toFixed(2), y: (ty + 2).toFixed(2) }, ticks).textContent = String(v);
      }
    }

    const n = turboSegments(turboCapacity);
    const span = n * (TURBO_SEG_DEG + TURBO_GAP_DEG) - TURBO_GAP_DEG;
    const start = -span / 2;
    segGroup.replaceChildren();
    segs = [];
    for (let i = 0; i < n; i++) {
      const a = start + i * (TURBO_SEG_DEG + TURBO_GAP_DEG);
      segs.push(el('path', { class: 'turbo-seg', d: arcPath(TURBO_R, a, a + TURBO_SEG_DEG) }, segGroup));
    }
    const tick = start + 0.25 * span;
    const [ix, iy] = polar(TURBO_R - 7, tick);
    const [ox, oy] = polar(TURBO_R + 7, tick);
    reignite.setAttribute('d', `M ${ix.toFixed(2)} ${iy.toFixed(2)} L ${ox.toFixed(2)} ${oy.toFixed(2)}`);
    turboSvg.dataset.segments = String(n);
    last.kmh = last.dist = last.filled = last.pct = -1;
    last.mode = '';
    last.turbo = null;
  }

  function update({ speed, x, fuel, turboActive, turboLockout }) {
    const kmh = Math.round(Math.abs(speed) * KMH_PER_MS);
    if (kmh !== last.kmh) {
      last.kmh = kmh;
      speedText.textContent = String(kmh);
      const pct = Math.min(kmh / maxKmh, 1);
      speedFill.setAttribute('stroke-dashoffset', (100 - pct * 100).toFixed(2));
      needle.setAttribute('transform', `rotate(${(-half + pct * SPEED_SWEEP).toFixed(1)} 50 50)`);
    }
    const dist = Math.round(x);
    if (dist !== last.dist) { last.dist = dist; distEl.textContent = String(dist); }

    const mode = turboLockout ? 'lockout' : turboActive ? 'active' : fuel < 0.2 ? 'low' : 'idle';
    if (mode !== last.mode) {
      last.mode = mode;
      turboSvg.dataset.state = mode;
      turboLabel.textContent = mode === 'lockout' ? 'RECARGA' : 'TURBO';
    }
    if (turboActive !== last.turbo) {
      last.turbo = turboActive;
      speedSvg.dataset.turbo = turboActive ? 'on' : 'off';
    }
    const filled = Math.round(fuel * segs.length);
    if (filled !== last.filled) {
      last.filled = filled;
      for (let i = 0; i < segs.length; i++) segs[i].classList.toggle('on', i < filled);
      turboSvg.dataset.filled = String(filled);
    }
    const pct = Math.round(fuel * 100);
    if (pct !== last.pct) { last.pct = pct; turboPct.textContent = String(pct); }
  }

  function setBotDist(m) {
    const v = Math.round(m);
    if (v !== last.bot) { last.bot = v; botDistEl.textContent = String(v); }
  }

  return { configure, update, setBotDist };
}
