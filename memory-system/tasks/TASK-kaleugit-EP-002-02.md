# TASK-kaleugit-EP-002-02 - Track scene from stage data + wiring in src/main.js

- Status: COMPLETED
- Priority: 1
- Description: Create src/track/track-scene.js (createTrackScene -> update(scroll), dispose()) moving road, mud layer, ground, sky background, finish portal and generic surface-zone meshes out of src/main.js; replace trackHeight/FINISH_LINE_X with track.heightAt/track.finishX; add ?stage=<id> and setStage(id). Owns src/main.js in EP-002. No physics value changes; human UX gate on feel. See docs/EPICO-EP-002-motor-estagios-TASKS.md Task 02.
- Depends On: TASK-kaleugit-EP-002-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-002-02-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 20:10
- Started: 2026-09-21 19:40
- Completed: 2026-09-21 20:10
- Planning: memory-system/task-docs/TASK-kaleugit-EP-002-02-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-002-02-implement-report-2026-09-21.md
- prior-art: src/main.js:159 — pre-migration road/mud/ground/finish-portal/sky code, moved verbatim into src/track/track-scene.js (no existing scene module)
- Delivery Handoff: DONE (owner: gohorse/subagent)
- Delivery PR: Pending
- Delivery Status: PR_OPEN
- UX Gate: pending human (batched at epic end) — Mata Atlantica track, mud, background and driving feel vs prototype

## Autonomous Decisions
- DA-001: Skipped architect/testing persona consults — Criteria: orchestrator instruction (speed over ceremony, at most 2 optional consults) — Rationale: mechanical, verbatim move defined in detail by the epic task list.
- DA-002: `setStage(stageIdFromUrl())` is called in the initLobby callback right before `startCountdown()` (race-start flow); `track`/`trackScene` are `let` bindings assigned there — Criteria: done criterion "chamada real no fluxo de início de corrida" — Rationale: nothing reads `track` before the first `tick`, which is only scheduled from that callback.
- DA-003: Unknown or absent `?stage=` id falls back to `getDefaultStage()` with `console.warn` (not an error) — Criteria: CDC default (conservative, reversible) — Rationale: a bad link still opens a playable race; warnings do not break the e2e error check.
- DA-004: Surface-zone overlays are flat strips at `heightAt + 0.02`, road depth, deformed once per zone and translated with scroll; missing `palette.zones[type]` falls back to 0x888888 — Criteria: CDC-002 (KISS) — Rationale: generic, no biome branch; Mata Atlantica has no zones so the prototype visual is unchanged.
- DA-005: The hidden ground plane is now added to the scene (still `visible = false`); previously it was created but never added — Criteria: default (no visual change) — Rationale: lets `dispose()` own it uniformly; invisible, so rendering is identical.
- DA-006: The physics slope formula in updateSpeed/updateRotation was kept inline (only `trackHeight` -> `track.heightAt`) instead of switching to `track.slopeAt` — Criteria: "nenhum valor de física muda" — Rationale: smallest diff; the extraction is EP-003-01.
