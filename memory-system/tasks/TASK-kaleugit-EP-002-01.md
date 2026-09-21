# TASK-kaleugit-EP-002-01 - Stage data format, registry and track query (no render)

- Status: PENDING
- Priority: 1
- Description: Create pure src/track/track.js (createTrack(stage) -> heightAt/slopeAt/surfaceAt/finishX, SURFACE_TYPES), src/stages/registry.js (createRegistry, validateStage), src/stages/index.js (import.meta.glob './*.stage.js'), src/stages/mata-atlantica.stage.js migrated verbatim from src/main.js, tests/sim/load-stages.js, npm run test:sim (node --test), and a height fixture from pre-migration commit d399713. Must not edit src/main.js. See docs/EPICO-EP-002-motor-estagios-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-001-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-002-01-implement
- Workstreams: None
- Execution Mode: Standard
- Last Updated: 2026-09-21 19:00
