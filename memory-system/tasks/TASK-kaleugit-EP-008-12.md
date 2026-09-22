# TASK-kaleugit-EP-008-12 - Placa de aviso (!) 20 m antes de cada hazard

- Status: COMPLETED
- Priority: 1
- Description: Manager UX feedback (2026-09-22). See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 12.
- Depends On: TASK-kaleugit-EP-008-10
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-12-implement
- Workstreams: [development]
- Execution Mode: Quick
- Last Updated: 2026-09-22 19:37
- Started: 2026-09-22 17:45
- Completed: 2026-09-22 19:37
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-12-implement-report-2026-09-22.md
- prior-art: stage surface zones + `createTrack(stage).surfaceAt` (EP-002-01), zone overlay meshes driven by `userData.from - scroll` in src/track/track-scene.js (EP-002-02), generic-over-`listStages()` sim tests (EP-005-01), flat-shaded low-poly meshes of the finish portal (EP-002-02)
- Evidence: PASS — `npm run test:sim` 123/123 (new hazard-signs.test.js; physics goldens and the height fixture unchanged); `npm test` 22/22 (new hazard-sign.spec.js proves the sign renders 20 m before the sand and before the mud, and that the same screen band is empty where no hazard is ahead); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it
- UX Gate: pending human (batched at epic end) — screenshots memory-system/task-docs/TASK-kaleugit-EP-008-12-*.png
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #36
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 19:37
## Autonomous Decisions
- DA-001: A hazard is a surface zone whose type differs from the stage's default surface (mud/sand on a dirt stage); terrain shape (`track.features`: bell/valley/plateau/wave/asym) is NOT a hazard — Criteria: manager asked for "sand or mud or any hazard"; only surface zones change traction (`grip`/`surfaceDrag`) — Rationale: hills and jumps are the racing line, not a trap; the rule is data-driven, so a future stage whose default surface is sand and whose exception is mud is handled without code changes.
- DA-002: Dedupe rule — hazard zones separated by less than 20 m are merged into one run and get a single sign at `runStart - 20`; a sign that would land before x = 0 is dropped — Criteria: "if two hazards are closer than 20 m, avoid stacking duplicate signs" — Rationale: the second sign would otherwise stand inside the first hazard, warning about something the player is already in; signs are therefore always >= 20 m apart.
- DA-003: Positions live in a pure module `src/stages/hazard-signs.js` (`signPositions`, `hazardRuns`, `hazardZones`, `SIGN_LEAD_M`), the mesh in `src/track/hazard-sign.js`, wired by `createTrackScene` — Criteria: task asks for a unit-testable pure function plus mesh creation in the scene builder — Rationale: sim tests cover the placement rule for every registered stage with no three.js; EP-008-13's free-roam stage gets its signs for free just by declaring zones.
- DA-004: The sign stands at z = -4.2 (just past the far edge of the road), has no collision body and is never read by the simulation — Criteria: "no effect on physics; goldens and race times must not change" — Rationale: the far side never covers the car; physics files untouched and goldens still pass at 1e-9.
- DA-005: e2e verifies the sign from rendered pixels (clipped screenshot + colour signature in a HUD-free band) instead of a new debug hook — Criteria: "do not add production-only test hooks" — Rationale: measured 0 matching pixels with no sign in view vs ~4400 with one, so the check is unambiguous.
- DA-006: No persona consults — Criteria: Quick mode, runbook — Rationale: contained additive visual change.
- Delivery Merged At: Pending
