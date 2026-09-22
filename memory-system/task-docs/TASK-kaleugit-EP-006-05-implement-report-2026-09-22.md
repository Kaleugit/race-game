# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-006-05
- Date Started: 2026-09-22 03:10
- Date Completed: 2026-09-22 03:50
- Role/Skill: implement
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-006-05-implement
- Planning Doc: TASK-kaleugit-EP-006-05-implement-planning-2026-09-22.md

## Summary
- New e2e specs: `tests/e2e/flow.spec.js` (CA-001, 2 tests), `progress.spec.js` (CA-002), `result.spec.js` (CA-006), `garage.spec.js` (CA-007); shared helper `tests/e2e/drive.js` (flow steps + `driveToFinish`). No change in `src/` or `index.html`.
- CA-002 real win in the browser (orchestrator option (a)): a held ArrowUp+Space loses on Mata (93.0 s) not for lack of air correction but because holding Space on an empty tank blocks the turbo recharge (`updateTurbo` in src/physics/car-physics.js). The reference driver's `space: fuel > 0` releases Space for one frame whenever the tank is empty. `driveToFinish` reproduces that: hold Space until `#turbobar` shows no full block, then toggle Space every animation frame (rAF loop in the page dispatching KeyboardEvents on `window`; reads only the HUD). With garage Estrada + Longa it wins Mata in 70.95 s / 71.28 s vs bot 79.36 s / 79.06 s (two full runs).

## Acceptance Criteria Status
| Criterion | Result | Evidence |
|---|---|---|
| CA-001 full flow, all result exits, no errors | PASS | flow.spec: lobby -> garage -> map -> Mata -> result -> MAPA -> Mata -> result -> GARAGEM (saved choice shown) -> map -> race running; teste-plano result -> REVANCHE -> new race -> new result; errors == [] |
| CA-002 clean storage = only Mata; win Mata; reload -> Cerrado unlocked | PASS | progress.spec: empty race_profile_v1, 1 unlocked item (mata), cerrado data-locked=true + disabled; real VITÓRIA on Mata; race_profile_v1.progress.unlocked contains cerrado; after page.reload() cerrado data-locked=false + enabled |
| CA-006 #end-delta == formatDelta(displayed times) | PASS | result.spec: toHaveText(formatDelta(data-seconds player, data-seconds bot)) and `^[+-]\d+\.\d{2}s$`; displayed times == data-seconds.toFixed(2) |
| CA-007 garage survives reload | PASS (e2e) | garage.spec: defaults pressed; azul/offroad/curta picked + confirmed; saved JSON; after reload exactly those 3 aria-pressed=true, color name AZUL |
| CA-007 bot does not inherit | PASS (unit, not e2e) | tests/sim/bot.test.js "resolveBotParams: stage data only, never the garage choice" (epic DA-008); npm run test:sim 86/86 |
| No src/ or index.html in diff | PASS | git diff --name-only origin/main...HEAD |

## Test Evidence
- `npx playwright test result garage progress flow` -> 5/5 (3.5 min)
- `npm test` x2 -> 9/9 both runs (5.3 min, 5.4 min; workers 2)
- `npm run test:sim` -> 86/86
- `./scripts/validate-changed.sh` -> PASS
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it

## Findings (for the orchestrator / human)
- Turbo feathering exploit: tapping Space every frame keeps turbo on ~50% of the time indefinitely at zero fuel (the release frame recharges dt/6, the press frame burns it under the `max(0, ...)` clamp). The reference driver (CA-004/CA-009 calibration benchmark, 73.7 s on Mata) relies on it. Human-rate pulsing in the sim (hold, then 0.5 s off / 0.25 s on, or 0.1/0.1 s) gives ~83-85 s on Mata and ~90-92 s on Cerrado, slower than the bot (~79 s / ~86 s). So with default parts the bot may be unbeatable for a human, and the "bot beatable" calibration is measured against a superhuman input. Not fixed here (src/ out of scope); worth reopening the EP-004/EP-005-01 calibration or the turbo recharge rule.
- e2e suite now ~5.4 min locally (was ~2.4 min): three extra Mata races (2 in flow, 1 in progress).

## Files Changed
- tests/e2e/{drive.js, flow.spec.js, progress.spec.js, result.spec.js, garage.spec.js}, docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md, task file, planning/report/validation notes, fragments
