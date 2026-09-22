/**
 * @module ui/garage
 * @summary Garage screen (RF-007/008/009): color swatches, tire and gearbox choice with trade-off
 * labels, and a confirm button. Receives data + callbacks only (no game-logic or storage imports).
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

/**
 * Renders and opens `#garage-overlay` (`[data-color-id]` swatches, `[data-tire]` and
 * `[data-gearbox]` buttons). Clicking an option updates the selection and calls
 * `onChange(selection)` (e.g. live preview on the lobby car); `#garage-confirm` calls
 * `onConfirm(selection)`. The caller decides what comes next (save, hide, open the map).
 * @summary Open the garage with the current selection and the available options.
 * @param {{
 *   selection: { color: string, tire: string, gearbox: string },
 *   colors: Array<{ id: string, label: string, hex: number }>,
 *   tires: Record<string, object> | object[],
 *   gearboxes: Record<string, object> | object[],
 *   onChange?: (sel: { color: string, tire: string, gearbox: string }) => void,
 *   onConfirm?: (sel: { color: string, tire: string, gearbox: string }) => void,
 * }} opts
 */
export function showGarage({ selection, colors, tires, gearboxes, onChange, onConfirm }) {
  const overlay = byId('garage-overlay');
  const colorsEl = byId('garage-colors');
  const tiresEl = byId('garage-tires');
  const gearboxesEl = byId('garage-gearboxes');
  const colorNameEl = byId('garage-color-name');
  const sel = { ...selection };
  const colorList = toList(colors);

  const refresh = () => {
    markSelected(colorsEl, 'colorId', sel.color);
    markSelected(tiresEl, 'tire', sel.tire);
    markSelected(gearboxesEl, 'gearbox', sel.gearbox);
    const c = colorList.find((x) => x.id === sel.color);
    colorNameEl.textContent = c ? c.label.toUpperCase() : '';
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

  const optionButtons = (list, key, tradeoff) =>
    toList(list).map((item) => {
      const b = el('button', { className: 'garage-opt', data: { [key]: item.id } });
      b.type = 'button';
      b.append(
        el('span', { className: 'opt-name', text: String(item.label ?? item.id).toUpperCase() }),
        el('span', { className: 'opt-trade', text: tradeoff(item) }),
      );
      b.addEventListener('click', () => pick(key, item.id));
      return b;
    });
  tiresEl.replaceChildren(...optionButtons(tires, 'tire', tireTradeoff));
  gearboxesEl.replaceChildren(...optionButtons(gearboxes, 'gearbox', gearboxTradeoff));

  byId('garage-confirm').onclick = () => onConfirm?.({ ...sel });

  refresh();
  setOverlay(overlay, true);
}

/** @summary Close `#garage-overlay`. */
export function hideGarage() {
  setOverlay(byId('garage-overlay'), false);
}
