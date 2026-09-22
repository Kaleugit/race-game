# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-007-01
- Date Started: 2026-09-21 21:00
- Date Completed: 2026-09-21 21:30
- Role/Skill: implement
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-007-01-implement
- Planning Doc: TASK-kaleugit-EP-007-01-implement-planning-2026-09-21.md

## Summary
- `src/audio/engine-model.js`: `ENGINE_DEFAULTS` (ratios 3.2/2.1/1.5/1.18/0.96, finalDrive 4.5, wheelRadius 0.5 = WHEEL_RADIUS of src/car.js, idle 800, redline 4000, upshift 3600, downshift 1500, launchRpm 1800, 4 cylinders, shiftTime 0.2 s, rpmResponse 20/s, airRevUp 8/s, airRevDown 3/s, gearboxPreset 'padrao'); `scaleGearRatios(ratios, preset)` = ratios / GEARBOXES[preset].topSpeedMult; `createEngineModel(options)` -> `{ update(dt, { speed, throttle, airborne }) -> { rpm, gear, load, shifting, firingHz }, reset(), gearRatios }`.
- Upshift requires both the wheel-coupled RPM and the engine RPM >= upshiftRpm (no shift while the engine is still catching up after a landing), so the drop is always exactly the ratio step. Downshift when the coupled RPM < downshiftRpm. No shifts while airborne.
- Calibration: top gear at BASE_PARAMS.maxSpeedTurbo = ~3575 rpm for every preset (ratio scaling cancels the preset top-speed multiplier); Estrada tire +5% gives ~3754 rpm, still below the redline.

## Calibration (harness, Mata Atlântica, dt 1/60, front-flip driver)
| Preset | First 1->2 upshift speed | Gears reached (no turbo / infinite turbo) |
|---|---|---|
| curta | 13.0 | 4 / 5 |
| padrao | 13.8 | 4 / 5 |
| longa | 14.4 | 3 / 5 |
- Upshift RPM ratios observed: 0.656, 0.714, 0.787, 0.814 (exact ratio steps).

## Acceptance Criteria Status
| Criterion | Result (PASS/FAIL) | Evidence |
|---|---|---|
| AC-001 RPM in [idle, redline] | PASS | engine-model.test.js, 6 runs, every step |
| AC-002 upshift ratio ±5% | PASS | engine-model.test.js (exact), >= 2 upshifts per run, 5th gear reached with turbo |
| AC-003 firingHz [25, 140] | PASS | engine-model.test.js (26.7-133.3 Hz by construction) |
| AC-004 Curta earlier than Longa | PASS | 13.0 < 13.8 < 14.4 |
| AC-005 purity grep | PASS | test asserts no AudioContext/window/document in the source |
| AC-006 test:sim | PASS | 43/43 |

## Requirement Traceability
| Requirement | Criterion | Test/Check | Result |
|---|---|---|---|
| REQ-001 | AC-001 | RPM range test; downshift/idle test | PASS |
| REQ-002 | AC-002 | upshift ratio test; downshift test | PASS |
| REQ-003 | AC-001 | airborne free-rev test | PASS |
| REQ-004 | AC-003, AC-004 | firingHz and preset tests | PASS |
| NFR purity | AC-005 | purity test | PASS |

## Test Evidence
- `npm run test:sim` -> PASS (43/43; 6 new in tests/sim/engine-model.test.js)
- `npm test` -> PASS (2/2, 49.6 s)
- `./scripts/validate-changed.sh` -> PASS
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it

## Files Changed
- src/audio/engine-model.js (new), tests/sim/engine-model.test.js (new), docs/INDEX-API.md (regenerated)
- docs/EPICO-EP-007-som-motor-TASKS.md (status), task file, planning/report/validation notes, session-log and development notes fragments
