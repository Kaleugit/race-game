/**
 * @module ui/garage
 * @summary Garage screen (RF-007/008/009/012): color swatches, tire, gearbox, engine, chassis and
 * turbo tank choice with trade-off labels, and a confirm button. Receives data + callbacks only (no
 * game-logic or storage imports).
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
 * `[data-gearbox]`, `[data-engine]`, `[data-chassis]`, `[data-tank]` buttons). Every option button
 * carries its trade-off label; each row's `.garage-sel-trade` line repeats the selected option's
 * label (shown instead of the per-button labels on short mobile-landscape screens). Clicking an
 * option updates the selection and calls `onChange(selection)` (e.g. live preview on the lobby car);
 * `#garage-confirm` calls `onConfirm(selection)`. The caller decides what comes next (save, hide,
 * open the map).
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

  const refresh = () => {
    markSelected(colorsEl, 'colorId', sel.color);
    const c = colorList.find((x) => x.id === sel.color);
    colorNameEl.textContent = c ? c.label.toUpperCase() : '';
    for (const s of sections) {
      markSelected(s.container, s.dataKey, sel[s.key]);
      const item = s.items.find((x) => x.id === sel[s.key]);
      if (s.selTradeEl) s.selTradeEl.textContent = item ? s.tradeoff(item) : '';
    }
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
