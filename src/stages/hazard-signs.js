/**
 * @module stages/hazard-signs
 * @summary Pure derivation of roadside warning-sign positions from stage data: one "!" sign
 * SIGN_LEAD_M metres before the start of every hazard run. No three.js, no DOM, no physics.
 */

/** Distance (metres of track x) between a sign and the start of the hazard it warns about. */
export const SIGN_LEAD_M = 20;

/** A sign is dropped when it would land before this x (no room on the track for the warning). */
export const MIN_SIGN_X = 0;

function defaultSurface(stage) {
  return (stage.surfaces && stage.surfaces.default) || 'dirt';
}

/**
 * @summary Surface zones that count as a hazard: every zone whose surface differs from the
 * stage default surface (mud/sand on a dirt stage). Terrain shape (track.features) is not a
 * hazard — it is the racing line, not a trap.
 * @param {object} stage stage data (see src/stages/*.stage.js)
 * @returns {Array<{from: number, to: number, type: string}>} sorted by `from`
 */
export function hazardZones(stage) {
  const def = defaultSurface(stage);
  const zones = (stage.surfaces && stage.surfaces.zones) || [];
  return zones
    .filter((z) => z.type !== def)
    .slice()
    .sort((a, b) => a.from - b.from || a.to - b.to);
}

/**
 * @summary Hazard zones merged into runs: consecutive hazards separated by less than SIGN_LEAD_M
 * form a single run, so the second one never gets its own (duplicate, badly placed) sign.
 * @param {object} stage stage data
 * @returns {Array<{from: number, to: number, type: string}>} the run type is the first zone's type
 */
export function hazardRuns(stage) {
  const runs = [];
  for (const z of hazardZones(stage)) {
    const last = runs[runs.length - 1];
    if (last && z.from - last.to < SIGN_LEAD_M) {
      last.to = Math.max(last.to, z.to);
    } else {
      runs.push({ from: z.from, to: z.to, type: z.type });
    }
  }
  return runs;
}

/**
 * @summary One warning sign per hazard run, SIGN_LEAD_M metres before the run starts.
 * @param {object} stage stage data
 * @returns {Array<{x: number, type: string, hazardFrom: number}>} ascending, at least
 *   SIGN_LEAD_M apart; a sign that would fall before MIN_SIGN_X is omitted.
 */
export function signPositions(stage) {
  const signs = [];
  for (const run of hazardRuns(stage)) {
    const x = run.from - SIGN_LEAD_M;
    if (x < MIN_SIGN_X) continue;
    signs.push({ x, type: run.type, hazardFrom: run.from });
  }
  return signs;
}
