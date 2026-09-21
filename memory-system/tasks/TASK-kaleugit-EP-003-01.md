# TASK-kaleugit-EP-003-01 - Extract per-instance car physics + simulation harness

- Status: COMPLETED
- Priority: 1
- Description: Create src/physics/params.js (BASE_PARAMS = current constants; CHASSIS_HITBOX/SUSP_* moved from src/car.js and re-exported) and DOM-free src/physics/car-physics.js (createCarPhysics({track, params}) -> state, step(dt, input), reset()) porting turbo/speed/physics/rotation/suspension with identical math; wire playerCar.step in src/main.js tick; create tests/sim/harness.js runRace(). Critical: high regression risk on driving feel; human UX gate. See docs/EPICO-EP-003-fisica-carro-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-002-03
- Blocked By: None
- Branch: TASK-kaleugit-EP-003-01-implement
- Workstreams: [development]
- Execution Mode: Critical
- Last Updated: 2026-09-21 23:26
- Started: 2026-09-21 20:10
- Completed: 2026-09-21 23:26
- Planning: memory-system/task-docs/TASK-kaleugit-EP-003-01-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-003-01-implement-report-2026-09-21.md
- prior-art: src/main.js:462 — pre-extraction updateTurbo/updateSpeed/updatePhysics/checkChassisHitbox/updateRotation/updateSuspension, moved verbatim into src/physics/car-physics.js (no existing physics module)
- Evidence: PASS — `npm run test:sim` 20/20 (incl. (a)-(d) and 3 golden tests vs pre-extraction physics), `npm test` 2 passed, done-criteria greps empty/as expected, scratch equivalence 12/12 runs bit-exact
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #8
- Delivery Status: MERGED
- UX Gate: pending human (batched at epic end) — driving, jump, landing, suspension and crash feel identical to the prototype

- Delivery Merged At: 2026-09-21 23:26
## Autonomous Decisions
- DA-001: Equivalence proven against the old code (text-extracted from 54003dd, three.js stubbed) frame by frame, plus committed golden checkpoints, in addition to the analytical invariants of the epic DA-003 — Criteria: orchestrator instruction (Critical: prove equivalence numerically) + CDC-001 — Rationale: extraction by text was cheap; bit-exact comparison is the strongest guard for driving feel.
- DA-002: Golden checkpoints are literals in tests/sim/car-physics.test.js instead of a fixture file — Criteria: escalation rule "more than 6 files changed" — Rationale: keeps source/test files at 6 (docs/INDEX-API.md is generated).
- DA-003: Module latches `state.chassisLatched` on the first chassis contact (replaces the old `crashSettling || crashed` guard) and passes `locked || chassisContact` to rotation on that frame — Criteria: CDC-006 (behavior-preserving) — Rationale: reproduces the old mid-frame `triggerCrash` side effects exactly; Task 02 removes the crash flow.
- DA-004: Dev toggles `suspensionEnabled` / `infiniteTurbo` live on `playerCar.state` (kept across `reset()`); main.js syncs its own toggles into it before each step; harness sets them via `initialState` — Criteria: input contract fixed to keys + locked (epic DA-004) — Rationale: no contract change; toggles still work before a race exists.
- DA-005: `turboActive = false` on crash stays in main.js `triggerCrash` (after the flame/headlight render), not in the module — Criteria: CDC-006 — Rationale: keeps the headlight/flame values of the contact frame identical to the old code.
- DA-006: Removed unused `SUSP_RELEASE_BOOST` (dead constant in main.js) instead of moving it — Criteria: YAGNI — Rationale: never read; no behavior change.
- DA-007: `src/car.js` got a JSDoc `@module` header besides the re-export — Criteria: CI JSDoc gate on changed src files — Rationale: required by governance CI; no code change.
- Delivery Merged At: Pending
