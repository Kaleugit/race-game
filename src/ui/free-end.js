/**
 * @module ui/free-end
 * @summary End screen of the free-roam mode (EP-008-13): no VITÓRIA/DERROTA, no opponent time and no
 * best time — just the distance covered, how long it took, and the two ways out (DE NOVO / VOLTAR).
 * Receives data + callbacks only (no game-logic or storage imports), like the other screen modules.
 */
import { byId, setOverlay } from './dom.js';
import { formatTime } from './format.js';

/**
 * Fills and opens `#free-end-overlay`: `#free-end-dist` with the metres covered (raw value in
 * `data-metres`) and `#free-end-time` with formatTime + raw `data-seconds`. Handlers are assigned
 * (not stacked), so the screen can be reopened on every run.
 * @summary Open the free-roam end screen.
 * @param {{
 *   distance: number,
 *   time: number,
 *   onAgain?: () => void,
 *   onBack?: () => void,
 * }} opts
 */
export function showFreeEnd({ distance, time, onAgain, onBack }) {
  const distEl = byId('free-end-dist');
  distEl.textContent = String(Math.round(distance));
  distEl.dataset.metres = String(distance);

  const timeEl = byId('free-end-time');
  timeEl.textContent = formatTime(time);
  if (Number.isFinite(time)) timeEl.dataset.seconds = String(time);
  else delete timeEl.dataset.seconds;

  const again = byId('free-end-again');
  again.onclick = onAgain ? () => onAgain() : null;
  const back = byId('free-end-back');
  back.onclick = onBack ? () => onBack() : null;

  setOverlay(byId('free-end-overlay'), true);
}

/** @summary Close `#free-end-overlay`. */
export function hideFreeEnd() {
  setOverlay(byId('free-end-overlay'), false);
}
