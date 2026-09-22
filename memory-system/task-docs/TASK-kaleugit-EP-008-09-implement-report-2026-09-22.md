# Report - TASK-kaleugit-EP-008-09 (lobby CORRIDA/GARAGEM + garage carousel)

- Date: 2026-09-22 14:20
- Branch: TASK-kaleugit-EP-008-09-implement
- Status: COMPLETED (PR open, UX gate pending human)

## What changed
- index.html: lobby shows CORRIDA (gold, `#lobby-play`) and GARAGEM (`#lobby-garage`) side by side under the title. The two garage docks are replaced by ONE carousel card `#garage-card` (top-left, same width budget as the old left dock so it never reaches the car): header GARAGEM + `#garage-step` "n/6", `#garage-prev` / part name `#garage-cat` / `#garage-next`, `#garage-pips` (one per part, current = gold), `#garage-slides` (MOTOR, CAMBIO, PNEU, CHASSI, TANQUE DE TURBO, COR; each keeps its old option container id), compact DESEMPENHO 2x2 summary, PRONTO (`#garage-confirm`). Card text 1.15x --ui-fs on desktop; mobile rules in max-height:500px. `#map-back` reads "LOBBY".
- src/ui/garage.js: `GARAGE_SLIDES` export; showGarage builds pips, handles arrows / pips / ArrowLeft-ArrowRight (listener removed by hideGarage) / touch swipe, wraps around, `#garage-card[data-slide]` = current slide; short direction-aware slide-in (transform + opacity, off under prefers-reduced-motion).
- src/lobby.js: CORRIDA -> openMap (`?stage=<id>` still starts that stage directly); GARAGEM -> openGarage; PRONTO saves the profile and calls openHome (also from the result screen); map back -> openHome; openHome re-applies the saved look to the lobby car.
- tests/e2e: drive.js (`openGarageFromLobby` = GARAGEM, new `openMapFromLobby` = CORRIDA, new `goToGarageSlide` clicks the real next arrow, `pickGarage` navigates to each part's slide and asserts aria-pressed, `confirmGarage` asserts the lobby is back); smoke/flow/progress/parts specs follow the new flow; garage-layout.spec.js measures `#garage-card` against the car pixels and TELA CHEIA on all 6 slides at 4 viewports (was 1 static state); parts.spec mobile fit checks every slide; new lobby.spec.js (3 tests).

## Screenshots
- Before: memory-system/task-docs/TASK-kaleugit-EP-008-09-before-{lobby,garage}-{1280x720,740x360}.png
- After: memory-system/task-docs/TASK-kaleugit-EP-008-09-after-{lobby,garage,garage-cor}-{1280x720,740x360}.png

## Validation
- `npm run test:sim` 104/104; `npm test` all green; `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it.
- UX gate: pending human (batched at epic end).
