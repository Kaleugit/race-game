# Report - TASK-kaleugit-EP-008-06 (garage parts panel redesign)

- Date: 2026-09-22 12:50
- Branch: TASK-kaleugit-EP-008-06-implement
- Status: COMPLETED (PR open, UX gate pending human)

## What changed
- index.html: garage markup split into `#garage-panel` (left dock: MOTOR, CÂMBIO, PNEU, DESEMPENHO) and `#garage-side` (right dock: CHASSI, TANQUE DE TURBO, COR, CONFIRMAR); garage CSS rewritten (docks, segmented controls, stat bars, solid gold CONFIRMAR, focus-visible rings, reduced-motion). Map/result screens untouched.
- src/ui/garage.js: `partStats(kind, item)` and `buildStats(parts)` (structured stats); rows render stat bars; hover/focus previews an option's stats; `#garage-summary` = whole-car deltas (same products as resolveCarParams). Text trade-off labels kept in `.opt-trade` (screen-reader text).
- src/lobby.js: the car rotates only while a press that started on the canvas is held (before, any mouse move over the page spun it, e.g. ~212 degrees on the way to JOGAR at 740px wide); no zoom while garage/map are open.
- tests/e2e/garage-layout.spec.js (new): at 1280x720, 1920x1080, 640x360, 740x360 both docks are inside the viewport, need no scroll, and intersect neither `#lobby-fullscreen-wrap` nor the car's box measured from the canvas' opaque pixels; CONFIRMAR fully in viewport; car width sanity check (> 0.45 x viewport height).

## Measurements after (CSS px)
| Viewport | Car x-range | Left dock | Right dock | TELA CHEIA bottom |
|---|---|---|---|---|
| 1280x720 | 432-851 | 16-379 x 16-551 | 901-1264 x 349-704 | 91 |
| 1920x1080 | 649-1277 | 16-436 x 16-713 | 1484-1904 x 607-1064 | 91 |
| 640x360 | 216-426 | 8-190 x 8-276 | 450-632 x 131-352 | 91 |
| 740x360 | 266-476 | 8-240 x 8-276 | 500-732 x 131-352 | 91 |

## Screenshots
- Before: memory-system/task-docs/TASK-kaleugit-EP-008-06-before-1280x720.png, memory-system/task-docs/TASK-kaleugit-EP-008-06-before-740x360.png
- After: memory-system/task-docs/TASK-kaleugit-EP-008-06-after-1280x720.png, memory-system/task-docs/TASK-kaleugit-EP-008-06-after-740x360.png, memory-system/task-docs/TASK-kaleugit-EP-008-06-after-build-1280x720.png (custom build, hover preview on engine 1.6)

## Design critique
- ux-ui-agent-skills:design-critic verdict "fix-first" with 5 findings; applied 1-4 (bigger mobile tap targets: 26px segments / 22px swatches + light swatch outline; dashed hover distinct from gold selection; zero rows dimmed + stronger DESEMPENHO; one label colour, 0.18em tracking). Not applied: BANDEIRANTE label size (part of the lobby scene, out of scope).

## Validation
- `npm run test:sim` 104/104; `npm test` 16/16 (12 existing unchanged + 4 new); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it.
- UX gate: pending human (batched at epic end).
