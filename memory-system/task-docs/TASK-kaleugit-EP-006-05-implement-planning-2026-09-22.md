# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-006-05
- Date: 2026-09-22 03:10
- Role/Skill: implement (no persona consults — runbook: speed over ceremony; test-only task, selectors fixed by EP-006-03/04)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-006-05-implement
- Depends On: TASK-kaleugit-EP-006-04

## Summary
- Objective: e2e coverage of the interface acceptance criteria CA-001, CA-002, CA-006 and CA-007 through the real UI, with no change in `src/` or `index.html`.

## Scope
### In Scope
- `tests/e2e/flow.spec.js` (CA-001), `progress.spec.js` (CA-002), `result.spec.js` (CA-006), `garage.spec.js` (CA-007), shared helper `tests/e2e/drive.js`.

### Out of Scope
- Any production code (`src/`, `index.html`), bot/stage calibration, the CA-007 "bot does not inherit" half (unit test `tests/sim/bot.test.js`, epic DA-008).

## Design
- Win on Mata Atlântica (CA-002) without production hooks: sim investigation showed the gap between a held ArrowUp+Space (93.0 s) and the reference driver (73.7 s) is NOT air correction — it is turbo feathering: holding Space on an empty tank blocks the recharge (`updateTurbo`), while the reference presses Space only while `fuel > 0`. A driver that holds Space until `#turbobar` shows no full block and then toggles Space every animation frame reproduces the reference in the sim (73.7 s misto/padrão; 70.7 s estrada/longa) vs bot 76.9–81.6 s (seeds 1–10). Implemented as a rAF loop inside the page dispatching KeyboardEvents to `window` (frame-aligned; reads only the HUD).
- Garage Estrada + Longa for the Mata races (fastest legal player setup in the sim; also exercises non-default parts).
- Runtime: REVANCHE exercised on `?stage=teste-plano` (same onRematch path); Mata races only where the CA needs the map/garage path or a real win.

## Acceptance Criteria
- AC-001 (CA-001): flow.spec — lobby -> garage -> map -> race -> result -> MAPA -> race -> result -> GARAGEM -> map -> race running; result -> REVANCHE -> race -> result; no pageerror/console.error.
- AC-002 (CA-002): progress.spec — clean storage: only Mata unlocked; real win on Mata; reload -> Cerrado unlocked.
- AC-003 (CA-006): result.spec — `#end-delta` == formatDelta(data-seconds player, data-seconds bot) and matches `^[+-]\d+\.\d{2}s$`.
- AC-004 (CA-007): garage.spec — non-default color/tire/gearbox survive reload; bot half cited from tests/sim/bot.test.js.
- AC-005: `git diff --name-only origin/main...HEAD` has no `src/` or `index.html`.

## Escalation Check
- The epic's orchestrator escalation ("ArrowUp+Space does not beat the bot consistently") applies literally: a held ArrowUp+Space loses on Mata. Resolved without touching src/ via the reference turbo policy (option (a) of the orchestrator brief) and reported as a finding (see report). No Mandatory Escalation Condition.

## Execution Plan
1. Sim investigation of the Mata gap. 2. drive.js helper + 4 specs. 3. npm test x2, test:sim. 4. Docs, delivery.
