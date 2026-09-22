# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-005-02
- Date: 2026-09-21 22:20
- Role/Skill: implement (no persona consults — runbook: speed over ceremony; data-only task)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-005-02-implement
- Depends On: TASK-kaleugit-EP-005-01

## Summary
- Objective: add the Cerrado stage as data only (open savanna, chapadas, red earth, hand-placed sand zones), 60–90 s reference time, a slightly harder bot, CA-008 on the real stage.

## Scope
### In Scope
- `src/stages/cerrado.stage.js` (only src file), `tests/sim/cerrado.test.js`, `tests/e2e/cerrado.spec.js`, `docs/INDEX-API.md`, `docs/PREREQUISITES.md` (measured times).

### Out of Scope
- Engine, physics, track scene, bot AI, main.js, presets; new surface types.

## Acceptance Criteria
- AC-001: CA-009 (Cerrado) — reference in [60, 90] s (generic stage-duration test).
- AC-002: CA-004 (Cerrado) — generic bot test.
- AC-003: CA-008 on Cerrado — Off-road faster than Estrada on sand; swaps >= 3%.
- AC-004: bot/reference ratio Cerrado < Mata, > 1; difficulty higher than Mata.
- AC-005: CA-003 — only src/stages/cerrado.stage.js under src/.
- AC-006: `npm run test:sim` and `npm test` green.
- AC-007 (human): look, difficulty, performance — pending human.

## Escalation Check
- Sand behavior covered by grip/surfaceDrag; no src edits beyond the new stage. No Mandatory Escalation Condition.

## Execution Plan
1. Draft stage, tune with scratch simulation (tune.mjs). 2. Tests. 3. Docs, validation, delivery.
