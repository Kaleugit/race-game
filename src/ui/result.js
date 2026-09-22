/**
 * @module ui/result
 * @summary Result screen (RF-006/CA-006): VITÓRIA/DERROTA, player/bot/best times with 2 decimals
 * (raw value in `data-seconds`), signed delta, and REVANCHE / MAPA / GARAGEM buttons.
 * Receives data + callbacks only (no game-logic or storage imports).
 */
import { byId, setOverlay } from './dom.js';
import { formatDelta, formatTime } from './format.js';

function setTime(node, seconds) {
  node.textContent = formatTime(seconds);
  if (Number.isFinite(seconds)) node.dataset.seconds = String(seconds);
  else delete node.dataset.seconds;
}

function bindButton(id, handler) {
  const b = byId(id);
  b.hidden = !handler;
  b.onclick = handler ? () => handler() : null;
}

/**
 * Fills and opens `#end-overlay`: `#end-player-time` / `#end-bot-time` / `#end-best-time` with
 * formatTime + raw `data-seconds`, and `#end-delta` = formatDelta(playerTime, botTime)
 * (`player − bot`). A button whose callback is omitted stays hidden. Handlers are assigned
 * (not stacked) so the screen can be reopened every race.
 * @summary Open the result screen.
 * @param {{
 *   won: boolean,
 *   playerTime: number,
 *   botTime: number,
 *   bestTime?: number | null,
 *   isNewBest?: boolean,
 *   onRematch?: () => void,
 *   onMap?: () => void,
 *   onGarage?: () => void,
 * }} opts
 */
export function showResult({ won, playerTime, botTime, bestTime = null, isNewBest = false, onRematch, onMap, onGarage }) {
  const resultEl = byId('end-result');
  resultEl.textContent = won ? 'VITÓRIA' : 'DERROTA';
  resultEl.className = won ? 'vitoria' : 'derrota';

  setTime(byId('end-player-time'), playerTime);
  setTime(byId('end-bot-time'), botTime);
  const bestEl = byId('end-best-time');
  setTime(bestEl, bestTime);
  bestEl.className = isNewBest ? 't-best-new' : 't-val';

  const deltaEl = byId('end-delta');
  deltaEl.textContent = formatDelta(playerTime, botTime);
  deltaEl.className = playerTime < botTime ? 'ahead' : 'behind';
  deltaEl.hidden = false;

  bindButton('end-play-again', onRematch);
  bindButton('end-map', onMap);
  bindButton('end-garage', onGarage);

  setOverlay(byId('end-overlay'), true);
}

/** @summary Close `#end-overlay`. */
export function hideResult() {
  setOverlay(byId('end-overlay'), false);
}
