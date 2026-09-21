# TASK-kaleugit-EP-002-01 - Stage data format, registry and track query (no render)

- Status: COMPLETED
- Priority: 1
- Description: Create pure src/track/track.js (createTrack(stage) -> heightAt/slopeAt/surfaceAt/finishX, SURFACE_TYPES), src/stages/registry.js (createRegistry, validateStage), src/stages/index.js (import.meta.glob './*.stage.js'), src/stages/mata-atlantica.stage.js migrated verbatim from src/main.js, tests/sim/load-stages.js, npm run test:sim (node --test), and a height fixture from pre-migration commit d399713. Must not edit src/main.js. See docs/EPICO-EP-002-motor-estagios-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-001-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-002-01-implement
- Workstreams: None
- Execution Mode: Standard
- Last Updated: 2026-09-21 19:15
- Started: 2026-09-21 19:05
- Completed: 2026-09-21 19:15
- Planning: memory-system/task-docs/TASK-kaleugit-EP-002-01-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-002-01-implement-report-2026-09-21.md
- prior-art: src/main.js:148 — pre-migration trackHeight/SLOPES/FEATURES, moved verbatim into src/track/track.js and src/stages/mata-atlantica.stage.js (no existing stage/track module)
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: #5
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: `test:sim` uses `node --test "tests/sim/*.test.js"` instead of the literal `node --test tests/sim/` — Criteria: CDC-001 — Rationale: the directory argument fails with MODULE_NOT_FOUND on Node 24.15 (Windows); the glob is expanded by Node itself and works on Windows and Linux CI.
- DA-002: `FEATURE_TYPES` exported from src/track/track.js next to `SURFACE_TYPES`; registry validates against both — Criteria: CDC-002 (DRY) — Rationale: single source of truth next to the math that interprets the types.
- DA-003: Surface zones are half-open `[from, to)`, first match wins; `from < to` required — Criteria: CDC-006 — Rationale: unambiguous adjacency between zones; Mata Atlantica has no zones so behaviour is unchanged.
- DA-004: `getDefaultStage()` = first of `listStages()` (order, then id), throws if none visible — Criteria: CDC-001 — Rationale: deterministic; fails loudly instead of returning undefined.
- DA-005: Fixture generator committed as tests/sim/fixtures/generate-mata-atlantica-heights.mjs; it evaluates lines 38-157 of `git show d399713:src/main.js`, independent of the new code — Criteria: CDC-001 — Rationale: fixture reproducible and not self-referential.
- Delivery Merged At: Pending
