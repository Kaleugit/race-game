# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-003-01
- Date: 2026-09-21 20:10
- Role/Skill: implement (consults: architect, testing)
- Execution Mode: Critical
- Branch: TASK-kaleugit-EP-003-01-implement (stacked on PR #7 / TASK-kaleugit-EP-002-03-implement)
- Depends On: TASK-kaleugit-EP-002-03

## Summary
- Objective: move the car physics out of `src/main.js` into a DOM-free, per-instance module without changing behavior, and add a headless simulation harness.
- Expected result: `createCarPhysics({ track, params })` drives the player car in `tick`; the new path is bit-exact with the old global-state path.

## Scope
### In Scope
- `src/physics/params.js` (BASE_PARAMS; SUSP_* and CHASSIS_HITBOX moved from `src/car.js`, re-exported there).
- `src/physics/car-physics.js` (turbo, speed, vertical/bounce, chassis check, rotation, suspension; same order and math).
- `src/main.js` wiring: `playerCar.step(dt, { ...keys, locked })`; visuals, HUD, sound and camera read `playerCar.state`; crash flow kept, triggered by `chassisContact`.
- `tests/sim/harness.js` `runRace()` and `tests/sim/car-physics.test.js`.

### Out of Scope
- Auto-righting / removal of crash flow (Task 02), parts presets and surface grip (Task 03), bot AI (EP-004), fixed timestep (DA-005 PROJECT_SPECS).

## Requirements
### Functional
- REQ-001: physics module pure (no DOM, three, Math.random).
- REQ-002: old physics functions removed from `src/main.js`; `playerCar.step` called in `tick`.
- REQ-003: harness `runRace({ stage, params, driver, dt, maxTime })` -> `{ finished, finishTime, maxSpeed, samples }`.
- REQ-004: behavior identical to the pre-extraction physics.

### Non-Functional
- No physics value changes; `src/car.js` change limited to moving/re-exporting constants (plus required JSDoc header); <= 6 source/test files.

## Acceptance Criteria
- AC-001: `grep -nE "document|window|from 'three'|Math\.random" src/physics/*.js` -> no output.
- AC-002: `grep -nE "function (updateSpeed|updatePhysics|updateRotation|updateSuspension|checkChassisHitbox)" src/main.js` -> no output; `grep -n "playerCar.step" src/main.js` -> call inside `tick`.
- AC-003: `npm run test:sim` green with (a) up on teste-plano at maxSpeedNormal ±2%, (b) up+space infinite turbo at maxSpeedTurbo ±2%, (c) up finishes mata-atlantica, (d) two instances do not interfere.
- AC-004: `npm test` green.
- AC-005: equivalence — new path matches the old path frame by frame (scratch comparison, bit-exact) and committed golden checkpoints (1e-9).
- UX gate (human only): driving, jump, landing, suspension and crash feel identical.

## Technical Impact
- Files/Modules: src/physics/params.js (new), src/physics/car-physics.js (new), src/car.js, src/main.js, tests/sim/harness.js (new), tests/sim/car-physics.test.js (new), docs/INDEX-API.md (regenerated).
- API/Contract Impact: new `createCarPhysics` contract as specified in the epic; `src/car.js` exports unchanged (re-exports).
- Data Model / Migration Impact: None.

## Execution Plan
1. params.js with verbatim constants; car.js imports and re-exports.
2. car-physics.js porting update* functions verbatim (`carPivot.rotation.z` -> `state.rot`, `bodyGroup.position.y` -> `state.suspY`, `state.scroll` -> `state.x`).
3. main.js: create `playerCar` in `setStage`; reset in `resetGame`; step in `tick`; render-only helpers for flame/headlight and suspension.
4. Scratch equivalence script (legacy functions text-extracted from 54003dd, three stubbed) vs new path; mutation check.
5. Harness + tests with golden checkpoints; `npm run test:sim`, `npm test`.

## Test Plan
- Levels: unit/sim (node --test), e2e (Playwright), scratch equivalence.
- REQ-001 -> AC-001 -> grep + purity test in car-physics.test.js
- REQ-002 -> AC-002 -> grep
- REQ-003 -> AC-003 -> tests (a)-(d)
- REQ-004 -> AC-005 -> scratch equivalence (12 runs) + golden tests
- All -> AC-004 -> `npm test`

## Risks / Open Questions
- Hidden ordering coupling through three objects (rotation read by the chassis check, body offset one frame old) — mitigated by frame-by-frame equivalence including crash, bounce, suspension toggle and jittered dt.
- Contact frame: old `triggerCrash` set `crashSettling` mid-frame, so the same frame's rotation ran as locked. Module passes `locked || chassisContact` to rotation (found by the equivalence script).
- No Mandatory Escalation Condition identified.

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
