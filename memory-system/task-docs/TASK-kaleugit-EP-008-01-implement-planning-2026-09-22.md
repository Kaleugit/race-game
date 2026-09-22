# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-008-01
- Date: 2026-09-22 00:28
- Role/Skill: implement (level design, no persona consults)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-008-01-implement
- Depends On: TASK-kaleugit-EP-005-02

## Summary
- Objective: races ~50% shorter on both visible stages (CA-009 revised to 30–45 s, manager decision 2026-09-22 / DA-007).
- Expected result: reference driver finishes Mata Atlântica and Cerrado in 30–45 s; CA-004 and "Cerrado a little harder" still hold.

## Scope
### In Scope
- `src/stages/mata-atlantica.stage.js`, `src/stages/cerrado.stage.js` (stage data only), `tests/sim/stage-duration.test.js` (CA-009 bounds), docs/PREREQUISITES.md reference times, docs/INDEX-API.md.
### Out of Scope
- Stage engine (`src/track/*`), bot tuning code, `tests/e2e/*` (EP-006-05 in parallel), engine sound (EP-008-02).

## Requirements
### Functional
- REQ-001: each visible stage keeps its signature sections (Mata: verbatim 0–885 m opening with the serra jump, riverbank mud, second serra + jump, mud bog; Cerrado: sandy lowland, one big chapada with escarpment and drop, vereda sand).
- REQ-002: CA-009 30–45 s for the reference driver with DEFAULT_PARTS.
- REQ-003: CA-004 (10 seeds, ±15% of median, all slower than reference) and bot/reference ratio Cerrado < Mata.

## Acceptance Criteria
- AC-001: `npm run test:sim` CA-009 tests pass with [30 s, 45 s].
- AC-002: CA-004 tests and cerrado.test.js ratio/CA-008 per-sand-zone tests pass.
- AC-003: Mata opening x < 885 identical (stages.test.js), stall scenario at x=213 unchanged (bot.test.js).
- AC-004: only stage files and sim tests change under src/ and tests/.

## Technical Impact
- Files/Modules: two stage data files, one sim test constant pair.
- API/Contract Impact: stage lengths (finishX Mata 2600 -> 1400, Cerrado 2800 -> 1360); zone lists shortened.
- Data Model / Migration Impact: None (profile best times from longer tracks stay stored; a new, shorter time simply beats them).

## Execution Plan
1. Truncate Mata after the second serra jump; keep the mud bog shortened to [1220,1320); finish 1400.
2. Cut Cerrado to the first chapada, pull the vereda sand stretch forward to [1030,1180); drop the second chapada and sand pan; finish 1360.
3. Measure with scratchpad/tune.mjs; update CA-009 bounds; run test:sim, validate-changed, npm test.

## Test Plan
- Levels: unit/sim (+ e2e regression)
- REQ-002 -> AC-001 -> `npm run test:sim` (stage-duration.test.js)
- REQ-003 -> AC-002 -> `npm run test:sim` (bot.test.js, cerrado.test.js)
- REQ-001 -> AC-003 -> `npm run test:sim` (stages.test.js, bot.test.js stall test)

## Risks / Open Questions
- Shorter stages compress bot/reference margins; mitigated by measurement (difficulty unchanged was enough).

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
