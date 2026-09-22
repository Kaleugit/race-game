# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-005-01
- Date: 2026-09-21 21:55
- Role/Skill: implement (no persona consults — runbook: speed over ceremony; data-only task)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-005-01-implement
- Depends On: TASK-kaleugit-EP-004-02

## Summary
- Objective: polish Mata Atlântica as data only so the reference driver finishes in 60–90 s (CA-009) with hand-placed ramps, dips, mud zones and big jumps, keeping CA-004 for the bot.

## Scope
### In Scope
- `src/stages/mata-atlantica.stage.js` (only src file).
- `tests/sim/stage-duration.test.js` (new, generic over listStages()), `tests/sim/bot.test.js` (CA-004 over listStages()), `tests/e2e/smoke.spec.js` (150 s wait).
- Golden guards repointed to `tests/sim/fixtures/mata-atlantica-legacy.stage.js` (frozen pre-EP-005 data).
- `docs/PREREQUISITES.md` (measured reference time), `docs/INDEX-API.md` (regenerated).

### Out of Scope
- Engine, physics, bot AI, main.js, track scene; Cerrado (Task 02).

## Acceptance Criteria
- AC-001: CA-009 — reference driver with DEFAULT_PARTS in [60, 90] s on every listed stage.
- AC-002: CA-004 — 10 seeds finish, ±15% of median, slower than reference, per listed stage.
- AC-003: only src/stages/mata-atlantica.stage.js changed under src/.
- AC-004: `npm run test:sim`, `npm test` green.
- AC-005 (human): hazards, pacing, bot difficulty, reference time — pending human.

## Escalation Check
- 60–90 s reached with stage data only: no engine/physics change needed. No Mandatory Escalation Condition.

## Execution Plan
1. Freeze old stage as test fixture; repoint goldens. 2. Extend the stage (keep 0–830 m opening verbatim) and tune with a scratch simulation. 3. Tests. 4. Docs, validation, delivery.
