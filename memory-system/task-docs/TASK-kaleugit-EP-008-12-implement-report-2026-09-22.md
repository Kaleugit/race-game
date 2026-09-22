# Report - TASK-kaleugit-EP-008-12 (warning sign "!" 20 m before every hazard)

- Date: 2026-09-22 18:20
- Branch: TASK-kaleugit-EP-008-12-implement
- Status: COMPLETED (PR open, UX gate pending human)

## What changed
- `src/stages/hazard-signs.js` (new, pure — no three.js, no DOM, no physics):
  - `SIGN_LEAD_M = 20`, `MIN_SIGN_X = 0`.
  - `hazardZones(stage)` — every surface zone whose type differs from `surfaces.default`, sorted by `from`.
  - `hazardRuns(stage)` — zones separated by less than `SIGN_LEAD_M` merged into one run (dedupe).
  - `signPositions(stage)` -> `[{ x, type, hazardFrom }]`, ascending, always >= 20 m apart; a sign that would land before `MIN_SIGN_X` is dropped.
- `src/track/hazard-sign.js` (new): `createHazardSign()` builds the low-poly mesh — grey post, dark triangular backing slab and border, yellow face (`0xffc61a`, slight emissive so it reads against dark jungle ground), box "!" bar + dot. All `MeshStandardMaterial({ flatShading: true })`, same language as the finish portal. `SIGN_TUNING` is the single frozen knob object at the top of the file.
- `src/track/track-scene.js`: builds one sign per `signPositions(stage)` entry at `(x, track.heightAt(x), SIGN_Z = -4.2)` — just past the far edge of the road, so it never covers the car — and scrolls it with `position.x = userData.x - scroll`, exactly like the zone overlays. Disposal is already generic (`objects` + `disposeObject`).
- No stage file, physics file, HUD or main.js change: the signs come from the data the stages already declare.

## Signs on the shipped stages
| stage | hazards | signs |
| --- | --- | --- |
| mata-atlantica | mud [930,1000), [1220,1320) | 910, 1200 |
| cerrado | sand [270,440), [1030,1180) | 250, 1010 |
| teste-plano | sand [60,90), mud [120,150) | 40, 100 |

## Screenshots (teste-plano, 1280x720)
- memory-system/task-docs/TASK-kaleugit-EP-008-12-sign-before-sand-1280x720.png — sign at x=40, car at 41 (sand starts at 60)
- memory-system/task-docs/TASK-kaleugit-EP-008-12-entering-sand-1280x720.png — the sand strip the sign announced
- memory-system/task-docs/TASK-kaleugit-EP-008-12-sign-before-mud-1280x720.png — sign at x=100 ahead of the car at 93 (mud starts at 120)
- memory-system/task-docs/TASK-kaleugit-EP-008-12-entering-mud-1280x720.png — the mud strip the sign announced

Two iterations: the first plate (circumradius 1.25) dominated the frame at ~2x the car height, so it was
brought down to 1.08 with a slightly thicker post; the "!" still fills the plate and is legible while the
car passes at 149 km/h.

## Tests
- `tests/sim/hazard-signs.test.js` (new, 14 cases): the 20 m lead; hazard = zone type != stage default (and the
  inverse, a sand-default stage); the `{ x, type, hazardFrom }` shape; zones 10 m apart merge into one sign;
  a 20 m gap is enough for two; unsorted/overlapping zones still yield ascending, non-stacked signs; a hazard
  too close to the start line gets no sign; no hazards -> no signs; and, generic over every registered stage
  (hidden included, via `loadStageModules()`), exactly one sign at `hazardStart - 20` per hazard run with no
  two signs closer than 20 m. A last case pins the exact positions of the three shipped stages.
- `tests/e2e/hazard-sign.spec.js` (new): drives `?stage=teste-plano`, clips a HUD-free screen band and counts
  sign-yellow pixels — 0 where no hazard is ahead, ~4400 with the sand sign in view at x=35 and again with the
  mud sign at x=95. No new production hook, no DOM assertion on the 3D scene.
- Physics untouched: `npm run test:sim` 123/123, including the frozen car-physics goldens (1e-9) and the
  mata-atlantica height fixture; CA-009 reference times unchanged.

## Validation
- `npm run test:sim` 123/123; `npm test` 22/22 (21 existing + 1 new); `./scripts/validate-changed.sh` PASS;
  validate-all N/A locally (TD-001/TD-002), CI runs it.
- UX gate: pending human (batched at epic end).
