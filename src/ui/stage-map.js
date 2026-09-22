/**
 * @module ui/stage-map
 * @summary Stage map screen (RF-002/003): one item per stage with `data-locked`; a locked stage
 * never calls `onSelect`. Also carries the always-unlocked MODO LIVRE card (EP-008-13) and the
 * pre-race options chosen here (EP-008-11: the ghost bot toggle).
 * Receives data + callbacks only (no storage or stage-registry imports).
 */
import { byId, el, setOverlay } from './dom.js';

/**
 * Renders and opens `#map-overlay` with one `[data-stage-id]` button per stage, in the given
 * order (pass `listStages()`). Unlocked stages call `onSelect(id)`; locked ones are disabled,
 * carry `data-locked="true"` and show "BLOQUEADO". `#map-back` shows only when `onBack` is given,
 * and `#map-ghost` ("BOT FANTASMA: LIGADO/DESLIGADO", `data-ghost="on|off"`) only when
 * `onGhostToggle` is given; it starts on `ghostBot` and reports every flip.
 * `#map-free` (MODO LIVRE, EP-008-13) shows only when `freeStage` and `onFree` are given; it is never
 * locked, sits apart from the numbered race rows and calls `onFree(freeStage.id)`.
 * @summary Open the stage map.
 * @param {{
 *   stages: Array<{ id: string, name?: string, order?: number, track?: { finishX?: number } }>,
 *   isUnlocked: (id: string) => boolean,
 *   onSelect?: (id: string) => void,
 *   onBack?: () => void,
 *   ghostBot?: boolean,
 *   onGhostToggle?: (on: boolean) => void,
 *   freeStage?: { id: string, name?: string, track?: { finishX?: number } } | null,
 *   onFree?: (id: string) => void,
 * }} opts
 */
export function showStageMap({
  stages, isUnlocked, onSelect, onBack, ghostBot = false, onGhostToggle, freeStage = null, onFree,
}) {
  const overlay = byId('map-overlay');
  const listEl = byId('map-stages');

  listEl.replaceChildren(
    ...stages.map((stage, i) => {
      const locked = !isUnlocked(stage.id);
      const b = el('button', {
        className: 'map-stage',
        data: { stageId: stage.id, locked: locked ? 'true' : 'false' },
      });
      b.type = 'button';
      b.disabled = locked;
      const km = stage.track?.finishX ? `${(stage.track.finishX / 1000).toFixed(1)} km` : '';
      b.append(
        el('span', { className: 'map-num', text: String(stage.order ?? i + 1).padStart(2, '0') }),
        el('span', { className: 'map-name', text: String(stage.name ?? stage.id).toUpperCase() }),
        el('span', { className: 'map-info', text: locked ? '\u{1F512} BLOQUEADO' : km }),
      );
      b.addEventListener('click', () => {
        if (b.dataset.locked === 'true') return;
        onSelect?.(stage.id);
      });
      return b;
    }),
  );

  // MODO LIVRE (EP-008-13): a mode, not a rung of the ladder — no number, no lock, its own card.
  const freeBtn = byId('map-free');
  const freeOn = !!(freeStage && onFree);
  freeBtn.hidden = !freeOn;
  if (freeOn) {
    freeBtn.dataset.stageId = freeStage.id;
    const km = freeStage.track?.finishX ? `${(freeStage.track.finishX / 1000).toFixed(1)} km` : '';
    byId('map-free-sub').textContent = km ? `${km} · SEM ADVERSÁRIO` : 'SEM ADVERSÁRIO';
    freeBtn.onclick = () => onFree(freeStage.id);
  } else {
    freeBtn.onclick = null;
  }

  const ghostBtn = byId('map-ghost');
  const ghostValueEl = byId('map-ghost-value');
  let ghostOn = !!ghostBot;
  const renderGhost = () => {
    ghostBtn.dataset.ghost = ghostOn ? 'on' : 'off';
    ghostBtn.setAttribute('aria-pressed', String(ghostOn));
    ghostValueEl.textContent = ghostOn ? 'LIGADO' : 'DESLIGADO';
  };
  renderGhost();
  ghostBtn.hidden = !onGhostToggle;
  ghostBtn.onclick = onGhostToggle
    ? () => {
        ghostOn = !ghostOn;
        renderGhost();
        onGhostToggle(ghostOn);
      }
    : null;

  const back = byId('map-back');
  back.hidden = !onBack;
  back.onclick = onBack ? () => onBack() : null;

  setOverlay(overlay, true);
}

/** @summary Close `#map-overlay`. */
export function hideStageMap() {
  setOverlay(byId('map-overlay'), false);
}
