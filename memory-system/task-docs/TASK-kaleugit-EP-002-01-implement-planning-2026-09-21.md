# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-002-01
- Date: 2026-09-21 19:05
- Role/Skill: architect + testing (consulted), implement
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-002-01-implement
- Depends On: TASK-kaleugit-EP-001-01

## Summary
- Objective: stage data format, pure stage registry and pure track query, with the Mata Atlantica track migrated as data.
- Expected result: `npm run test:sim` proves the migrated track height equals the pre-migration `trackHeight` (fixture from d399713); `src/main.js` untouched.

## Scope
### In Scope
- src/track/track.js, src/stages/registry.js, src/stages/index.js, src/stages/mata-atlantica.stage.js
- tests/sim/load-stages.js, tests/sim/stages.test.js, tests/sim/fixtures/mata-atlantica-heights.json (+ generator script)
- package.json `test:sim` script
### Out of Scope
- src/main.js wiring and track scene (Task 02); surface physics (EP-003).

## Requirements
### Functional
- REQ-001: Track height/slope/surface are computed from stage data by a pure module.
- REQ-002: Stages are discovered from `src/stages/*.stage.js` and validated.
- REQ-003: Migration preserves the current track relief exactly.

## Acceptance Criteria
- AC-001: heightAt equals the d399713 fixture within 1e-9 at all 1881 points.
- AC-002: validateStage rejects unknown feature.type / surface.type, missing finishX; createRegistry rejects duplicate id.
- AC-003: listStages sorts by order and omits hidden.
- AC-004: surfaceAt returns default outside zones and the zone type inside ([from, to)).
- AC-005: track.js / registry.js contain no document/window/three.
- AC-006: src/main.js not in the diff.
- AC-007: `npm test` (e2e) stays green.

## Technical Impact
- Files/Modules: see Scope.
- API/Contract Impact: new stage data contract + `createTrack` / `createRegistry` API + `SURFACE_TYPES` (consumed by EP-002-02, EP-003-03).
- Data Model / Migration Impact: None.

## Test Plan
- Levels: unit/sim (node:test), e2e regression.
- REQ-003 -> AC-001 -> stages.test.js "(a)"
- REQ-002 -> AC-002, AC-003 -> stages.test.js "(b)", "(c)"
- REQ-001 -> AC-004 -> stages.test.js "(d)" + slopeAt formula test
- AC-005 -> grep; AC-006 -> git diff --name-only origin/main...HEAD; AC-007 -> npm test

## Persona Consults
- Architect: FEATURE_TYPES next to SURFACE_TYPES in track.js; zones half-open [from, to); default stage = first of listStages() sorted by order then id, throw if none; validate numeric fields; createRegistry accepts only the glob map shape.
- Testing: assert fixture point count; fixture generator independent of new code; `node --test tests/sim/` fails on Node 24 Windows -> use a glob.

## Risks / Open Questions
- Float summation order must match exactly (kept: base, noise in order, features).

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
