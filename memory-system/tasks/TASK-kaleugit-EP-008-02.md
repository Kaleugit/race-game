# TASK-kaleugit-EP-008-02 - Longer gears (sound)

- Status: COMPLETED
- Priority: 1
- Description: Lengthen every gear in src/audio/engine-model.js (each gear spans >=1.3x its current speed range), RPM stays in [800,4000], ratio-based drop on upshift; update tests/sim/engine-model.test.js. See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 02.
- Depends On: TASK-kaleugit-EP-007-02
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-02-implement
- Workstreams: [development]
- Execution Mode: Quick
- Last Updated: 2026-09-22 03:34
- Started: 2026-09-22 00:25
- Completed: 2026-09-22 03:34
- Planning: N/A (Quick)
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-02-implement-report-2026-09-22.md
- prior-art: src/audio/engine-model.js ENGINE_DEFAULTS (EP-007-01) — tuned in place (finalDrive), no new module; tests/sim/engine-model.test.js extended
- Evidence: PASS — `npm run test:sim` 88/88 (2 new: every gear >= 1.3x legacy speed range for 3 presets; first upshift >= 1.25x later and fewer upshifts per race vs legacy gearing); `npm test` 4/4
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #26
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 03:34
## Autonomous Decisions
- DA-001: finalDrive 4.5 -> 3.3 — Criteria: >= 1.3x per gear, ratio-step drop kept — Rationale: uniform 1.36x on every gear with one constant; preset ordering intact.
- DA-002: "turbo reaches 5th" -> "reaches >= 4th" + static top-gear RPM bound — Criteria: request (longer gears, physics unchanged) — Rationale: 1.3x longer gears 1-4 need ~46 m/s to leave 4th vs 43.3 m/s turbo top speed.
- DA-003: in-race first-upshift check at >= 1.25x (static check carries the 1.3x criterion) — Criteria: done criteria are per-gear ranges — Rationale: RPM lag makes the in-race ratio ~1.30x; keeps the unchanged ">= 2 upshifts" assertion green for longa/throttle.
- UX Gate: pending human (batched at epic end).
- Delivery Merged At: Pending
