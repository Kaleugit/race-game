# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-002-02
- Date: 2026-09-21 19:20
- Role/Skill: implement (persona consults skipped for speed, see DA-001)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-002-02-implement
- Depends On: TASK-kaleugit-EP-002-01

## Summary
- Objective: build the stage-dependent scene objects from stage data and wire stage selection into `src/main.js`.
- Expected result: Mata Atlantica renders and drives exactly as before, now fed by `createTrack(stage)` + `createTrackScene(...)`.

## Scope
### In Scope
- New `src/track/track-scene.js` (`createTrackScene({ scene, skyScene, stage, track })` -> `{ update(scroll), dispose() }`): road, mud layer (if `visuals.mudLayer`), ground (`palette.ground`), sky background (`visuals.background`), finish portal at `track.finishX`, generic surface-zone overlays (`palette.zones[type]`).
- `src/main.js`: remove `SLOPES`, `FEATURES`, `FINISH_LINE_X`, `BOT_FINISH_TIME`, `trackHeight` and moved scene code; `track.heightAt` / `track.finishX`; `?stage=<id>` + `setStage(id)`.
### Out of Scope
- Physics extraction (EP-003-01), surface physics (EP-003), test stage (Task 03), runtime stage switch UI (EP-006-04).

## Requirements
- REQ-001: Scene objects are built from stage data only (no biome branches).
- REQ-002: `dispose()` removes the stage's meshes/textures from the scenes.
- REQ-003: Stage chosen by `?stage=<id>` (fallback default); `setStage` disposes the previous stage.
- REQ-004: No physics value changes; current track unchanged.

## Acceptance Criteria
- AC-001: `grep -nE "SLOPES|FEATURES|FINISH_LINE_X|BOT_FINISH_TIME|function trackHeight|misty-tropical-jungle" src/main.js` -> no output.
- AC-002: `grep -n "createTrackScene\|setStage" src/main.js` shows the call in the race-start flow and `trackScene.update(state.scroll)` in `tick`.
- AC-003: `npm test` green; `npm run test:sim` green.
- AC-004: unknown `?stage=` id falls back to default without page errors (ad-hoc browser check).
- UX gate (human only): Mata Atlantica indistinguishable from the prototype.

## Test Strategy
- Existing e2e smoke (full race on the migrated stage) + sim tests; ad-hoc Playwright check for `?stage=nope` and `?stage=mata-atlantica`. Driving feel/visual parity is human-only.
