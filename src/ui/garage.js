/**
 * @module ui/garage
 * @summary Garage screen (RF-007/008/009/012): color swatches, tire, gearbox, engine, chassis and
 * turbo tank choice with trade-off stat bars and a build summary, and a confirm button. Receives
 * data + callbacks only (no game-logic or storage imports).
 */
import { byId, el, setOverlay, toList } from './dom.js';

const SURFACE_LABELS = { dirt: 'TERRA', mud: 'LAMA', sand: 'AREIA' };

function pct(mult) {
  const p = Math.round((mult - 1) * 100);
  const sign = p > 0 ? '+' : p < 0 ? '−' : '±';
  return `${sign}${Math.abs(p)}%`;
}

/**
 * @summary Trade-off label for a tire preset: top speed change + grip per surface.
 * @param {{ topSpeedMult?: number, grip?: Record<string, number> }} tire
 */
export function tireTradeoff(tire) {
  const parts = [`VEL ${pct(tire.topSpeedMult ?? 1)}`];
  for (const [surface, g] of Object.entries(tire.grip ?? {})) {
    parts.push(`${SURFACE_LABELS[surface] ?? surface.toUpperCase()} ${Math.round(g * 100)}%`);
  }
  return parts.join(' · ');
}

/**
 * @summary Trade-off label for a gearbox preset: acceleration x top speed.
 * @param {{ accelMult?: number, topSpeedMult?: number }} gearbox
 */
export function gearboxTradeoff(gearbox) {
  return `ACEL ${pct(gearbox.accelMult ?? 1)} · VEL ${pct(gearbox.topSpeedMult ?? 1)}`;
}

/**
 * Engine trade-off as the car feels it: net acceleration (engine accel / engine weight), top speed,
 * turbo time per tank (1 / burn rate) and weight.
 * @summary Trade-off label for an engine preset.
 * @param {{ accelMult?: number, topSpeedMult?: number, mass?: number, turboBurnMult?: number }} engine
 */
export function engineTradeoff(engine) {
  const mass = engine.mass ?? 1;
  return `ACEL ${pct((engine.accelMult ?? 1) / mass)} · VEL ${pct(engine.topSpeedMult ?? 1)}`
    + ` · TURBO ${pct(1 / (engine.turboBurnMult ?? 1))} · PESO ${pct(mass)}`;
}

/**
 * Chassis trade-off: weight, the acceleration it costs/gives (accel / mass) and air/landing
 * stability (air torque and landing rebound are divided by mass).
 * @summary Trade-off label for a chassis preset.
 * @param {{ mass?: number }} chassis
 */
export function chassisTradeoff(chassis) {
  const mass = chassis.mass ?? 1;
  const feel = mass < 1 ? 'MENOS ESTÁVEL' : mass > 1 ? 'MAIS ESTÁVEL' : 'EQUILIBRADO';
  return `PESO ${pct(mass)} · ACEL ${pct(1 / mass)} · ${feel}`;
}

/**
 * @summary Trade-off label for a turbo tank preset: turbo time per full tank x weight.
 * @param {{ capacity?: number, mass?: number }} tank
 */
export function tankTradeoff(tank) {
  return `TURBO ${pct(tank.capacity ?? 1)} · PESO ${pct(tank.mass ?? 1)}`;
}

/**
 * Structured trade-off of one part for the stat bars. `delta` stats are fractions vs. the default
 * part (+0.06 = +6%), `abs` stats are absolute grip (0..1). `tone: 'up'` = more is better (green /
 * orange bar), `'flat'` = a pure trade-off (neutral bar, e.g. weight).
 * @summary Stat list (`{ key, kind: 'delta' | 'abs', value, tone }`) for a part of the given kind.
 * @param {'tire' | 'gearbox' | 'engine' | 'chassis' | 'tank'} kind
 * @param {object} item preset (e.g. TIRES.misto)
 */
export function partStats(kind, item) {
  const d = (key, mult, tone = 'up') => ({ key, kind: 'delta', value: (mult ?? 1) - 1, tone });
  if (kind === 'tire') {
    return [
      d('VEL', item.topSpeedMult),
      ...Object.entries(item.grip ?? {}).map(([surface, g]) => ({
        key: SURFACE_LABELS[surface] ?? surface.toUpperCase(), kind: 'abs', value: g, tone: 'up',
      })),
    ];
  }
  if (kind === 'gearbox') return [d('ACEL', item.accelMult), d('VEL', item.topSpeedMult)];
  if (kind === 'engine') {
    const mass = item.mass ?? 1;
    return [d('ACEL', (item.accelMult ?? 1) / mass), d('VEL', item.topSpeedMult),
      d('TURBO', 1 / (item.turboBurnMult ?? 1)), d('PESO', mass, 'flat')];
  }
  if (kind === 'chassis') {
    const mass = item.mass ?? 1;
    return [d('PESO', mass, 'flat'), d('ACEL', 1 / mass), d('ESTAB.', mass)];
  }
  if (kind === 'tank') return [d('TURBO', item.capacity), d('PESO', item.mass, 'flat')];
  return [];
}

/**
 * Whole-car deltas vs. the original build, with the same products as resolveCarParams
 * (src/parts/presets.js): net acceleration = gearbox x engine accel / total mass, top speed =
 * tire x gearbox x engine, turbo time = tank capacity / engine burn rate, weight = engine x chassis x tank.
 * @summary Build summary stats (`ACEL`, `VEL`, `TURBO`, `PESO`) for a full part selection.
 * @param {{ tire?: object, gearbox?: object, engine?: object, chassis?: object, tank?: object }} parts presets
 */
export function buildStats({ tire = {}, gearbox = {}, engine = {}, chassis = {}, tank = {} }) {
  const mass = (engine.mass ?? 1) * (chassis.mass ?? 1) * (tank.mass ?? 1);
  const accel = ((gearbox.accelMult ?? 1) * (engine.accelMult ?? 1)) / mass;
  const top = (tire.topSpeedMult ?? 1) * (gearbox.topSpeedMult ?? 1) * (engine.topSpeedMult ?? 1);
  const turbo = (tank.capacity ?? 1) / (engine.turboBurnMult ?? 1);
  return [
    { key: 'ACEL', kind: 'delta', value: accel - 1, tone: 'up' },
    { key: 'VEL', kind: 'delta', value: top - 1, tone: 'up' },
    { key: 'TURBO', kind: 'delta', value: turbo - 1, tone: 'up' },
    { key: 'PESO', kind: 'delta', value: mass - 1, tone: 'flat' },
  ];
}

// A delta of +/-40% fills half of a diverging bar (the biggest single-part change is the big tank).
const DELTA_FULL = 0.4;

function statRow(stat) {
  const value = Math.round(stat.value * 100);
  const row = el('div', { className: 'stat' });
  const bar = el('span', { className: 'stat-bar' });
  const fill = el('i');
  let tone = 'flat';
  if (stat.kind === 'abs') {
    tone = 'abs';
    bar.classList.add('abs');
    fill.style.left = '0%';
    fill.style.width = `${Math.max(0, Math.min(1, stat.value)) * 100}%`;
  } else {
    const f = Math.max(-1, Math.min(1, stat.value / DELTA_FULL));
    if (value === 0) tone = 'zero';
    else if (stat.tone === 'up') tone = value > 0 ? 'good' : 'bad';
    fill.style.left = `${50 + Math.min(0, f) * 50}%`;
    fill.style.width = `${Math.abs(f) * 50}%`;
  }
  row.dataset.tone = tone;
  bar.append(fill);
  const text = stat.kind === 'abs' ? `${value}%` : pct(1 + stat.value);
  row.append(el('span', { className: 'stat-k', text: `${stat.key} ` }), bar, el('span', { className: 'stat-v', text }));
  return row;
}

function renderStats(container, stats) {
  container.replaceChildren(...stats.map(statRow));
}

function hexCss(hex) {
  return typeof hex === 'number' ? `#${hex.toString(16).padStart(6, '0')}` : String(hex);
}

function markSelected(container, key, value) {
  for (const b of container.children) {
    const on = b.dataset[key] === value;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

// One garage row per part: selection key, option container id, data-* key, trade-off label.
const PART_SECTIONS = [
  { key: 'tire', containerId: 'garage-tires', dataKey: 'tire', listKey: 'tires', tradeoff: tireTradeoff },
  { key: 'gearbox', containerId: 'garage-gearboxes', dataKey: 'gearbox', listKey: 'gearboxes', tradeoff: gearboxTradeoff },
  { key: 'engine', containerId: 'garage-engines', dataKey: 'engine', listKey: 'engines', tradeoff: engineTradeoff },
  { key: 'chassis', containerId: 'garage-chassis', dataKey: 'chassis', listKey: 'chassis', tradeoff: chassisTradeoff },
  { key: 'tank', containerId: 'garage-tanks', dataKey: 'tank', listKey: 'tanks', tradeoff: tankTradeoff },
];

/**
 * Renders and opens `#garage-overlay` (`[data-color-id]` swatches and `[data-tire]`,
 * `[data-gearbox]`, `[data-engine]`, `[data-chassis]`, `[data-tank]` buttons). The overlay is two
 * docks that leave the lobby car visible: `#garage-panel` (engine, gearbox, tire, build summary)
 * and `#garage-side` (chassis, tank, color, confirm). Every option button carries its trade-off
 * label (`.opt-trade`, screen-reader text); each row's `.garage-sel-trade` shows the selected
 * option's stats as bars (the hovered / focused option while pointing at it) and `#garage-summary`
 * the whole-car deltas. Clicking an option updates the selection and calls `onChange(selection)`
 * (e.g. live preview on the lobby car); `#garage-confirm` calls `onConfirm(selection)`. The caller
 * decides what comes next (save, hide, open the map).
 * @summary Open the garage with the current selection and the available options.
 * @param {{
 *   selection: { color: string, tire: string, gearbox: string, engine: string, chassis: string, tank: string },
 *   colors: Array<{ id: string, label: string, hex: number }>,
 *   tires: Record<string, object> | object[],
 *   gearboxes: Record<string, object> | object[],
 *   engines: Record<string, object> | object[],
 *   chassis: Record<string, object> | object[],
 *   tanks: Record<string, object> | object[],
 *   onChange?: (sel: object) => void,
 *   onConfirm?: (sel: object) => void,
 * }} opts
 */
export function showGarage({ selection, colors, onChange, onConfirm, ...lists }) {
  const overlay = byId('garage-overlay');
  const colorsEl = byId('garage-colors');
  const colorNameEl = byId('garage-color-name');
  const sel = { ...selection };
  const colorList = toList(colors);
  const sections = PART_SECTIONS.map((s) => {
    const container = byId(s.containerId);
    return {
      ...s,
      container,
      items: toList(lists[s.listKey]),
      selTradeEl: container.parentElement.querySelector('.garage-sel-trade'),
    };
  });

  const summaryEl = byId('garage-summary');
  const selected = (s) => s.items.find((x) => x.id === sel[s.key]);
  const showStats = (s, item) => {
    if (!s.selTradeEl) return;
    renderStats(s.selTradeEl, item ? partStats(s.key, item) : []);
    s.selTradeEl.classList.toggle('preview', !!item && item.id !== sel[s.key]);
  };
  const refresh = () => {
    markSelected(colorsEl, 'colorId', sel.color);
    const c = colorList.find((x) => x.id === sel.color);
    colorNameEl.textContent = c ? c.label.toUpperCase() : '';
    const picked = {};
    for (const s of sections) {
      markSelected(s.container, s.dataKey, sel[s.key]);
      picked[s.key] = selected(s);
      showStats(s, picked[s.key]);
    }
    renderStats(summaryEl, buildStats(picked));
  };
  const pick = (key, value) => {
    if (sel[key] === value) return;
    sel[key] = value;
    refresh();
    onChange?.({ ...sel });
  };

  colorsEl.replaceChildren(
    ...colorList.map((c) => {
      const b = el('button', { className: 'swatch', data: { colorId: c.id } });
      b.type = 'button';
      b.title = c.label;
      b.setAttribute('aria-label', c.label);
      b.style.background = hexCss(c.hex);
      b.addEventListener('click', () => pick('color', c.id));
      return b;
    }),
  );

  for (const s of sections) {
    s.container.replaceChildren(
      ...s.items.map((item) => {
        const b = el('button', { className: 'garage-opt', data: { [s.dataKey]: item.id } });
        b.type = 'button';
        b.append(
          el('span', { className: 'opt-name', text: String(item.label ?? item.id).toUpperCase() }),
          el('span', { className: 'opt-trade', text: s.tradeoff(item) }),
        );
        b.addEventListener('click', () => pick(s.key, item.id));
        // Compare before picking: pointing at (or focusing) an option previews its stats in the row.
        const back = () => showStats(s, selected(s));
        b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') showStats(s, item); });
        b.addEventListener('pointerleave', back);
        b.addEventListener('focus', () => showStats(s, item));
        b.addEventListener('blur', back);
        return b;
      }),
    );
  }

  byId('garage-confirm').onclick = () => onConfirm?.({ ...sel });

  refresh();
  setOverlay(overlay, true);
}

/** @summary Close `#garage-overlay`. */
export function hideGarage() {
  setOverlay(byId('garage-overlay'), false);
}
