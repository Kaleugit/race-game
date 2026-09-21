# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-003-02
- Date: 2026-09-21 20:25
- Role/Skill: implement (no persona consults — DA-007)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-003-02-implement
- Depends On: TASK-kaleugit-EP-003-01

## Summary
- Objective: replace the crash -> fade -> race restart flow with RF-005 auto-righting: the car rests on its chassis and, after 1.5 s upside down on the ground, is set back on its wheels keeping x.
- Expected result: no DNF/restart by flipping; `step` returns `righted: true` on the righting frame. Human decision (2026-09-21): behavior change approved; EP-003-01 goldens must stay green for non-crash runs.

## Scope
### In Scope
- `src/physics/params.js`: `autoRightDelay` 1.5, `chassisFriction`, `chassisSettleRate`.
- `src/physics/car-physics.js`: chassis penetration depth + rest, wheels-down gating of the wheel clamp, settle rotation, upside-down timer, `autoRight()`, `righted` event; `chassisLatched` removed.
- `src/main.js`: remove `triggerCrash`, `finalizeCrash`, `CRASH_AUTO_RESET`, `CRASH_SETTLE_DURATION`, crash state and tick branches; `locked = inputFrozen`.
- `index.html`: remove the dead crash overlay DOM/CSS.
- `tests/sim/harness.js` (no stop on contact, `rightedTimes`), `tests/sim/auto-right.test.js`.

### Out of Scope
- Righting animation/effect (UX gate), presets/grip (Task 03), bot (EP-004).

## Requirements
### Functional
- REQ-001: upside-down timer (`cos(rot - slope angle) < 0` and ground contact) rights the car at `params.autoRightDelay` = 1.5 s: rot = slope angle, angVel 0, y on the ground, speed 0, x kept; `righted: true`.
- REQ-002: chassis contact no longer ends physics; the car rests on CHASSIS_HITBOX with `params.chassisFriction`.
- REQ-003: no crash flow / race reset in `src/main.js`.

### Non-Functional
- Non-crash physics unchanged (EP-003-01 goldens at 1e-9); physics module stays pure.

## Acceptance Criteria
- AC-001 (CA-005): teste-plano, rot = PI, speed 0, on the ground, no input: righted at t in [1.3, 1.7] s, then cos(rot) > 0.9.
- AC-002: flipping during constant up on mata-atlantica never resets x to 0 and the race finishes.
- AC-003: `grep -nE "triggerCrash|finalizeCrash|CRASH_AUTO_RESET" src/main.js` -> no output.
- AC-004: `npm run test:sim` and `npm test` green (goldens unchanged).
- UX gate (human only): moment/effect of the auto-right.

## Technical Impact
- Files: src/physics/params.js, src/physics/car-physics.js, src/main.js, index.html, tests/sim/harness.js, tests/sim/auto-right.test.js (new), docs/INDEX-API.md (regenerated).
- API/Contract: `step` now emits `righted`; state gains `overturned`, `upsideDownTime`, loses `chassisLatched`; params gain 3 keys. Harness: `crashed` = any chassis contact, new `rightedTimes`, no early stop.
- Data Model / Migration Impact: None.

## Execution Plan
1. Params. 2. Physics: penetration depth, rest, wheels-down gate, settle, timer, autoRight. 3. Harness + tests; confirm goldens untouched. 4. main.js/index.html cleanup. 5. e2e.

## Test Plan
- REQ-001 -> AC-001 -> auto-right.test.js (CA-005, single righted event, throttle ignored upside down)
- REQ-002 -> auto-right.test.js (drop on roof: no sinking, no jitter, friction stop)
- REQ-001/002 -> AC-002 -> sequence test (front-flip driver)
- REQ-003 -> AC-003 -> grep
- NFR -> AC-004 -> golden tests + `npm test`

## Risks / Open Questions
- Chassis rest instability (tremor/tunneling): mitigated by exact translation by the penetration depth; tested.
- Righting with speed 0 on a steep climb can leave a constant-`up` driver unable to climb (needs a run-up/turbo) — track property, noted for the UX gate.
- No Mandatory Escalation Condition identified.

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
