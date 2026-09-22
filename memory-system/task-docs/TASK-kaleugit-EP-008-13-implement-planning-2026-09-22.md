# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-008-13
- Date: 2026-09-22 21:40
- Role/Skill: implement (frontend + content/level design)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-008-13-implement
- Depends On: TASK-kaleugit-EP-008-09, TASK-kaleugit-EP-008-11, TASK-kaleugit-EP-008-12

## Summary
- Objective: add a free-roam mode on a 5000 m terrain (manager UX request, 2026-09-22), reachable from
  the map screen, with no opponent, no result and no effect on the player's progress.
- Expected result: a MODO LIVRE card on the map starts a 5 km data-driven stage; the HUD shows speed,
  turbo and distance; reaching 5000 m opens a plain end screen with DE NOVO and VOLTAR; the LOBBY
  button leaves at any time; `race_profile_v1` is byte-for-byte unchanged by a free-roam run.

## Scope
### In Scope
- New data-driven stage `src/stages/terra-livre.stage.js` (5000 m, dirt/mud/sand, climbs, dips, jumps)
  using only the existing stage data model.
- A `mode` field in the stage contract (`race` default, `free`) validated by `src/stages/registry.js`.
- Free-roam semantics in `src/main.js`: no bot physics instance, no race bar, no 1º/2º badges, no
  "BOT CHEGOU" notice, no ghost, no `recordWin`.
- New `src/ui/free-end.js` end screen + markup/CSS in `index.html`.
- MODO LIVRE card on `#map-overlay` (`src/ui/stage-map.js`, wired in `src/lobby.js`).
- Hidden short free-roam stage `src/stages/livre-teste.stage.js` so the e2e can reach the end screen.
- Sim test for the stage data + e2e for the flow; `tests/e2e/map-layout.spec.js` extended.

### Out of Scope
- Any change to physics, parts, sound, bot calibration or the race stages.
- Persisting anything about free roam (no best distance, no unlock, no counter).
- New art assets (the stage reuses an existing background image).

## Requirements
### Functional
- REQ-001: a 5000 m stage mixing dirt, mud and sand zones, climbs, dips and jumps, varied enough to
  stay interesting over 5 km, expressed only with `track.slopes` / `track.features` / `surfaces.zones`.
- REQ-002: free roam has no opponent at all and no win/defeat.
- REQ-003: a free-roam run writes nothing to `race_profile_v1`.
- REQ-004: the HUD shows speed, turbo and distance; reaching 5000 m opens an end screen with VOLTAR
  (lobby) and DE NOVO; the in-race LOBBY button still leaves at any time.
- REQ-005: entry is an always-unlocked MODO LIVRE card on `#map-overlay`, visually distinct from the
  race stages.
- REQ-006: garage choices (parts + colour) apply in free roam exactly as in a race.
- REQ-007: the EP-008-12 warning signs work on this stage (first hazard past x = 20 m).

### Non-Functional
- The map panel keeps its EP-008-11 layout guarantees (no overlap, no scrolling, everything in the
  viewport) at 1280x720, 1920x1080, 640x360 and 740x360 — proven by an extended spec, not a weakened one.
- The free-roam stage must be drivable end to end without the car getting stuck.

## Acceptance Criteria
- AC-001: `terra-livre` validates, is 5000 m long, carries mud and sand hazards in every kilometre,
  uses every feature kind, has real climbs and descents and is never steeper than Mata Atlântica.
- AC-002: `signPositions(terra-livre)` returns one sign 20 m before each of its 21 hazards.
- AC-003: the reference driver finishes the 5 km without ever being stopped for 3 s.
- AC-004: entering MODO LIVRE from the map shows `#hud[data-mode="free"]`, no race bar, no bot notice,
  no ghost, and leaves `race_profile_v1` unchanged, before and after the run.
- AC-005: reaching the end opens `#free-end-overlay` (never `#end-overlay`), DE NOVO restarts and
  VOLTAR returns to the lobby home.
- AC-006: the map layout spec passes at the four viewports with the new card included.

## Technical Impact
- Files/Modules: `src/stages/terra-livre.stage.js`, `src/stages/livre-teste.stage.js`,
  `src/stages/registry.js`, `src/ui/free-end.js`, `src/ui/stage-map.js`, `src/lobby.js`,
  `src/main.js`, `index.html`, `tests/sim/free-roam.test.js`, `tests/e2e/free-roam.spec.js`,
  `tests/e2e/drive.js`, `tests/e2e/map-layout.spec.js`, `docs/INDEX-API.md`.
- API/Contract Impact: stage contract gains an optional `mode` field (`race` default) plus the
  `STAGE_MODES` / `stageMode` / `isFreeRoam` helpers; `showStageMap` gains `freeStage` / `onFree`;
  `initLobby` gains `freeStage`. All additive.
- Data Model / Migration Impact: None (nothing new is persisted).

## Execution Plan
1. Extend the stage contract with `mode` and the free-roam helpers.
2. Author the 5 km stage in ten 500 m sections; measure max slope, elevation and drivability offline.
3. Branch the game loop on `state.freeRoam` (no bot, no race bar, no ghost, no result, no progress).
4. Add the free-roam end screen module + markup/CSS and the MODO LIVRE card.
5. Sim test for the stage data and the mode contract; e2e for the flow; extend the map layout spec.
6. Screenshots at 1280x720 and 740x360; full `npm run test:sim` + `npm test`; delivery.

## Test Plan
- Levels: sim (node:test) + e2e (Playwright) + manual screenshot review.
- Requirement -> Criterion -> Test:
  - REQ-001 -> AC-001 -> `tests/sim/free-roam.test.js`
  - REQ-007 -> AC-002 -> `tests/sim/free-roam.test.js`
  - REQ-001 -> AC-003 -> `tests/sim/free-roam.test.js` (harness + reference driver)
  - REQ-002/003/004/006 -> AC-004/AC-005 -> `tests/e2e/free-roam.spec.js`
  - REQ-005 -> AC-006 -> `tests/e2e/map-layout.spec.js`
- PASS/FAIL rule per criterion: the named suite is green, with no console error collected by
  `trackErrors`.
