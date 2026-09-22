# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-008-05
- Date: 2026-09-22 03:40
- Role/Skill: implement (car physics + bot calibration, no persona consults)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-008-05-implement
- Depends On: TASK-kaleugit-EP-008-01, TASK-kaleugit-EP-008-02

## Summary
- Objective: fix the root cause of the EP-006-05 turbo bug (no recharge while Space is held; re-ignition with any fuel > 0, so 60 Hz Space toggling keeps turbo on at an empty tank) and recalibrate the bot against a human-achievable reference.
- Expected result: holding Space is the best turbo policy; the reference holds Space; human-rate policies beat the bot median; CA-004 / CA-009 / Cerrado-harder still hold.

## Scope
### In Scope
- `src/physics/car-physics.js` (updateTurbo), `src/physics/params.js` (`turboReigniteFuel`), `src/bot/bot-driver.js` (TUNING), `src/stages/cerrado.stage.js` (bot.difficulty), `tests/sim/reference-driver.js`, `tests/e2e/drive.js`, `tests/e2e/progress.spec.js` (comment), new sim tests, docs/PREREQUISITES.md.
### Out of Scope
- Any other physics, stage layouts, engine sound, garage/parts (EP-008-03/04).

## Requirements
### Functional
- REQ-001: the tank recharges whenever the turbo is not burning, Space held or not.
- REQ-002: after running empty the turbo re-ignites only at `BASE_PARAMS.turboReigniteFuel` (hysteresis).
- REQ-003: the reference driver holds Space; CA-004 (bot slower than reference on every seed) and CA-009 (30–45 s) on both stages; Cerrado ratio < Mata.
- REQ-004: human-rate policies (hold only; 0.1 s taps) beat the bot median by >= 3%.
- REQ-005: e2e driveToFinish holds ArrowUp + Space; the progress e2e still wins Mata.

## Acceptance Criteria
- AC-001: sim test — holding Space on an empty tank recharges, no re-ignition below turboReigniteFuel.
- AC-002: sim test — frame / 0.1 s tapping yields no more turbo (spent + in tank) and no more distance than holding.
- AC-003: CA-004 / CA-009 / cerrado ratio tests green with the new reference.
- AC-004: new per-stage human-rate test green.
- AC-005: EP-003-01 goldens unchanged at 1e-9 (none hits Space held on an empty tank).
- AC-006: `npm test` 9/9, `npm run test:sim` green.

## Technical Impact
- API/Contract Impact: new `BASE_PARAMS.turboReigniteFuel` (0.25); new car state field `turboLockout`; turbo behavior (bug fix).
- Data Model / Migration Impact: None.

## Execution Plan
1. Fix updateTurbo with a lockout flag; add the parameter.
2. Reference driver `space: true`; measure ref / 0.1 s taps / frame taps / hold-only / bot seeds (scratchpad tune5.mjs).
3. Recalibrate bot TUNING (error rate, lift length) and Cerrado difficulty.
4. Tests, e2e helper, docs; full `npm test`.

## Test Plan
- Levels: unit/sim + e2e
- REQ-001/002 -> AC-001/002 -> car-physics.test.js
- REQ-003/004 -> AC-003/004 -> bot.test.js, cerrado.test.js, stage-duration.test.js
- REQ-005 -> AC-006 -> `npm test`

## Risks / Open Questions
- Bot difficulty has a weak, noisy effect on time once turbo is budget-limited for everyone; mitigated by making throttle lifts (not turbo hesitations) the costly error.

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
