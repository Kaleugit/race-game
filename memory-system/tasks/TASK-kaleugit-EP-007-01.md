# TASK-kaleugit-EP-007-01 - Engine model (RPM, gears, shifts)

- Status: COMPLETED
- Priority: 1
- Description: Pure engine model src/audio/engine-model.js (RPM from speed, gear ratios scaled by the EP-003 gearbox preset, ratio-based RPM drop on upshift, idle/redline, airborne free-rev, firingHz) with tests/sim/engine-model.test.js over runRace. See docs/EPICO-EP-007-som-motor-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-003-03
- Blocked By: None
- Branch: TASK-kaleugit-EP-007-01-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 21:16
- Started: 2026-09-21 21:00
- Completed: 2026-09-21 21:16
- Planning: memory-system/task-docs/TASK-kaleugit-EP-007-01-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-007-01-implement-report-2026-09-21.md
- prior-art: src/sound.js — existing GEARS table / virtualSf pseudo-RPM (replaced in EP-007-02, not reused); src/parts/presets.js GEARBOXES reused for ratio scaling; no existing engine model (src/audio/ is new)
- Evidence: PASS — `npm run test:sim` 43/43 (6 new in tests/sim/engine-model.test.js: RPM in [800, 4000] and firingHz in [25, 140] on every step for 3 presets x throttle/turbo on Mata Atlântica; every upshift exact ratio step; first upshift speed curta 13.0 < padrao 13.8 < longa 14.4; airborne free-rev; downshift/idle; purity grep)
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: #12
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: finalDrive 4.5 — Criteria: orchestrator calibration note + CDC-005 — Rationale: top gear at BASE_PARAMS.maxSpeedTurbo sits at ~3575 rpm (below upshift and redline) for every preset; 1st gear shifts at ~13-14 m/s.
- DA-002: gearbox preset scales ratios by 1 / GEARBOXES[preset].topSpeedMult — Criteria: epic "escaladas pelo preset" — Rationale: reuses the EP-003 data (no new field); Curta shorter ratios shift earlier in speed, top-gear RPM at top speed is preset-invariant.
- DA-003: upshift requires engine RPM and wheel-coupled RPM >= upshiftRpm; no shifts airborne — Criteria: epic ratio-drop criterion — Rationale: avoids shifting while the engine lags after a landing, so every upshift is the exact ratio step.
- DA-004: wheelRadius default 0.5 duplicated from src/car.js WHEEL_RADIUS with a source-text drift test — Criteria: purity requirement — Rationale: src/car.js imports three.js; moving the constant would touch out-of-scope files.
- DA-005: launch clutch slip (launchRpm 1800 at full throttle) and first-order RPM response — Criteria: KISS — Rationale: continuous RPM at standstill/launch and on landing without extra state.
- DA-006: No persona consults — Criteria: runbook (at most 2 lightweight consults; human prefers speed) — Rationale: API and criteria fully specified by the epic Task 01.
- UX Gate: pending human (batched at epic end) — covered by EP-007-02 synthesis.
- Delivery Merged At: Pending
