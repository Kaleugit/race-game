# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-003-01
- Date Started: 2026-09-21 20:10
- Date Completed: 2026-09-21 20:55
- Role/Skill: implement
- Execution Mode: Critical
- Branch: TASK-kaleugit-EP-003-01-implement (stacked on PR #7)
- Planning Doc: TASK-kaleugit-EP-003-01-implement-planning-2026-09-21.md

## Summary
- The car physics now lives in `src/physics/car-physics.js` (`createCarPhysics({ track, params })` -> `{ state, step(dt, input), reset() }`), with constants in `src/physics/params.js` (`BASE_PARAMS`). `src/main.js` calls `playerCar.step(dt, { ...keys, locked })` in `tick` and only renders from `playerCar.state`. The crash flow is unchanged and is triggered by `chassisContact`. `tests/sim/harness.js` adds `runRace()`.
- Behavior-preserving: the new path is bit-exact with the pre-extraction code (see Equivalence).

## Acceptance Criteria Status
| Criterion | Result (PASS/FAIL) | Evidence |
|---|---|---|
| AC-001 purity grep | PASS | `grep -nE "document\|window\|from 'three'\|Math\.random" src/physics/*.js` -> no output; also a purity test (adds `performance.`/`Date.`) |
| AC-002 main.js greps | PASS | old-function grep -> no output; `src/main.js:573` `const events = playerCar.step(dt, { ...keys, locked: state.crashSettling \|\| state.inputFrozen });` inside `tick` |
| AC-003 (a) | PASS | teste-plano, up: last 60 samples within ±2% of maxSpeedNormal |
| AC-003 (b) | PASS | teste-plano, up+space, infiniteTurbo: last 60 samples within ±2% of maxSpeedTurbo |
| AC-003 (c) | PASS | mata-atlantica, up: finished, no crash, finishTime 23.6 s (harness time) |
| AC-003 (d) | PASS | two instances (throttle / mixed) stepped in one loop deep-equal isolated runs for 1200 frames |
| AC-004 `npm test` | PASS | 2 passed (smoke.spec.js, stage-data.spec.js) |
| AC-005 equivalence | PASS | scratch 12/12 runs bit-exact; golden tests 3/3 |
| UX gate | PENDING HUMAN | batched at epic end |

## Equivalence (Critical-mode evidence)
- Scratch script (session scratchpad, not committed): text-extracts `updateTurbo`, `updateSpeed`, `computeAvg`, `updatePhysics`, `checkChassisHitbox`, `updateRotation`, `updateSuspension`, `triggerCrash`, `finalizeCrash`, `resetGame` and the state/constants from `src/main.js @ 54003dd`, stubs three.js objects (`carPivot.rotation.z`, `bodyGroup.position.y`, springs, flame) and runs the old `tick` physics branches (crash settle -> finalize -> auto reset). The new side runs `createCarPhysics` with the new `tick` orchestration.
- Compared every frame with `Object.is` on x, speed, y, vy, rot, angVel, airborne, airTime, bounceLevel, lean, slopeRotVisual, suspY, body offset, suspVy, prevTrackH, fuel, turboActive, crashSettling, crashed.
- Coverage: 2 stages (mata-atlantica, teste-plano) x 3 scenarios (full mixed script: countdown with keys held, turbo until empty fuel and recharge, turbo-only, brake, reverse to -maxReverse, ground lean both ways, suspension off/on, air rotation to crash with settle/finalize/reset x2, infinite turbo; constant throttle 120 s; infinite turbo 120 s) x 2 dt modes (fixed 1/60; jittered with 1/144, 0.021, 1/30, 0.05 clamp and dt = 0 frames) = 12 runs, up to 8,898 frames each.
- Result: 12/12 bit-exact. Mutation check: legacy `BOUNCE_DECAY` 0.4 -> 0.41 makes 6/12 runs diverge (the comparison can fail).
- Divergence found and fixed during the check: on the chassis-contact frame the old `triggerCrash` set `crashSettling` in the middle of the frame, so that frame's rotation update already ran as locked. The module now passes `locked || chassisContact` to the rotation step.
- Committed guard: `tests/sim/car-physics.test.js` golden tests (throttle, infinite turbo, mixed input on mata-atlantica) with legacy checkpoints every 300 frames plus the finish frame, finish time, max speed and a per-frame accumulator, tolerance 1e-9. Changing `SUSP_K` 77 -> 77.5 fails all 3 (checked, then reverted).

## Requirement Traceability
| Requirement | Criterion | Test/Check | Result |
|---|---|---|---|
| REQ-001 | AC-001 | grep + purity test | PASS |
| REQ-002 | AC-002 | grep | PASS |
| REQ-003 | AC-003 | tests (a)-(d) | PASS |
| REQ-004 | AC-005, AC-004 | equivalence script + golden tests + e2e | PASS |

## Test Evidence
- `npm run test:sim` -> PASS (20/20: 10 new + 10 existing)
- `npm test` -> PASS (2 passed)
- `./scripts/validate-changed.sh` -> see delivery validation note
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it

## Files Changed
- src/physics/params.js (new), src/physics/car-physics.js (new), src/car.js (constants moved to params and re-exported; JSDoc header required by CI), src/main.js, tests/sim/harness.js (new), tests/sim/car-physics.test.js (new), docs/INDEX-API.md (regenerated)
- docs/EPICO-EP-003-fisica-carro-TASKS.md (status), task file, planning/report/validation notes, session-log and development notes fragments

## Completion Checklist
- [x] Task marked `COMPLETED`
- [x] `Last Updated` refreshed in task file
- [x] Session log updated
- [x] No unresolved semantic ambiguity
