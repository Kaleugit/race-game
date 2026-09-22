# Task Report (Minimal)

## Task Info
- Task ID: TASK-kaleugit-EP-008-05
- Date Started: 2026-09-22 03:40
- Date Completed: 2026-09-22 04:10
- Role/Skill: implement (car physics + bot calibration)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-008-05-implement
- Planning Doc: TASK-kaleugit-EP-008-05-implement-planning-2026-09-22.md

## Summary
- Root cause fixed in `updateTurbo` (`src/physics/car-physics.js`): the tank now recharges whenever the turbo is not burning (Space held or not). When the tank runs empty while burning, `state.turboLockout` is set and the turbo cannot re-ignite until fuel >= `BASE_PARAMS.turboReigniteFuel` (0.25, new). Every input pattern has the same fuel budget (burn only while on, recharge only while off), so tapping gives no advantage over holding.
- Reference driver (`tests/sim/reference-driver.js`) holds Space. e2e `driveToFinish` holds ArrowUp + Space (the 60 Hz toggle loop is gone). Progress e2e keeps garage Estrada + Longa (hold-only sim time on Mata 39.98 s vs bot seeds 44.6–51.3 s).
- Bot recalibrated (the bot used the same exploit): TUNING errorRate {easy 1.2, hard 0.4} (was 0.8/0.2), liftDuration [0.4, 0.9] s (was [0.25, 0.6]) — with turbo budget-limited, a turbo hesitation only saves fuel, so throttle lifts are the costly error. Cerrado bot.difficulty 0.6 -> 0.9; Mata stays 0.5.

## Measured times (dt 1/60, DEFAULT_PARTS, scratchpad tune5.mjs)
| Stage | Reference (hold) | 0.1 s taps | frame toggle | hold only (no air corr.) | Bot median (seeds 1..10) | Bot range | Ratio | Tap margin |
|---|---|---|---|---|---|---|---|---|
| Mata Atlântica | 43.02 s | 43.35 s | 43.40 s | 43.02 s | 46.25 s | 44.65–51.3 s | 1.075 | 6.3% |
| Cerrado | 42.93 s | 43.47 s | 43.53 s | 42.93 s | 45.45 s | 44.00–48.9 s | 1.059 | 4.4% |
- Before (exploit reference): Mata ref 39.68 s / bot 42.77 s; Cerrado ref 40.07 s / bot 42.82 s. Constant up unchanged (51.7 / 51.8 s).
- Frame toggling is now slower than holding (43.40 > 43.02 s): the exploit is gone.

## EP-003-01 goldens
- Unchanged, still 1e-9: 'throttle' never uses Space, 'turbo' runs with infiniteTurbo, 'mixed' burns 2 s (2/3 tank) then recharges 10 s, so it never holds Space on an empty tank. No golden was regenerated.

## Acceptance Criteria Status
| Criterion | Result | Evidence |
|---|---|---|
| AC-001 empty tank recharges with Space held + hysteresis | PASS | car-physics.test.js "turbo: holding Space on an empty tank recharges it" |
| AC-002 tapping <= holding | PASS | car-physics.test.js "turbo: tapping Space ... gives no more turbo than holding it" |
| AC-003 CA-004 / CA-009 / Cerrado harder | PASS | bot.test.js, stage-duration.test.js, cerrado.test.js |
| AC-004 human-rate policies beat bot median by >= 3% | PASS | bot.test.js "CA-004 (<stage>): human-rate policies" |
| AC-005 goldens unchanged | PASS | car-physics.test.js golden tests |
| AC-006 npm test + test:sim | PASS | see Test Evidence |

## Test Evidence
- `npm run test:sim` -> PASS (90/90)
- `./scripts/validate-changed.sh` -> PASS
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it
- `npm test` -> PASS (9/9, 3.1 min; progress e2e real Mata win: player 40.33 s vs bot 46.43 s)

## Files Changed
- src/physics/car-physics.js
- src/physics/params.js
- src/bot/bot-driver.js
- src/stages/cerrado.stage.js
- tests/sim/reference-driver.js
- tests/sim/car-physics.test.js
- tests/sim/bot.test.js
- tests/e2e/drive.js
- tests/e2e/progress.spec.js
- docs/PREREQUISITES.md
- docs/INDEX-API.md

## Completion Checklist
- [x] Task marked `COMPLETED`
- [x] `Last Updated` refreshed in task file
- [x] Session log updated
- [x] No unresolved semantic ambiguity
