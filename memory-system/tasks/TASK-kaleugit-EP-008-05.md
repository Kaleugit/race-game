# TASK-kaleugit-EP-008-05 - Turbo recharge fix + bot recalibration for humans

- Status: COMPLETED
- Priority: 1
- Description: Fix updateTurbo (recharge whenever turbo is inactive, even with space held; minimum fuel to re-ignite after empty) that let 60 Hz space tapping keep turbo on at zero fuel; reference driver holds space; recalibrate bot so reference and human-rate tapping both beat it (CA-004/CA-009); update tests/e2e/drive.js to hold space. See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 05.
- Depends On: TASK-kaleugit-EP-008-01, TASK-kaleugit-EP-008-02
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-05-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 04:10
- Started: 2026-09-22 03:40
- Completed: 2026-09-22 04:10
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-05-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-05-implement-report-2026-09-22.md
- prior-art: src/physics/car-physics.js updateTurbo (EP-003-01 verbatim extraction) fixed in place; tests/sim/reference-driver.js and bot TUNING (EP-004-01) recalibrated; scratchpad tune.mjs (EP-005) extended as tune5.mjs with tap/frame/hold profiles
- Evidence: PASS — Mata ref (hold Space) 43.02 s, 0.1 s taps 43.35 s, bot d=0.5 median 46.25 s (44.65–51.3, ratio 1.075); Cerrado ref 42.93 s, taps 43.47 s, bot d=0.9 median 45.45 s (44.00–48.9, ratio 1.059); frame toggling 43.40/43.53 s (slower than holding); goldens unchanged; `npm run test:sim` 90/90; `./scripts/validate-changed.sh` PASS; `npm test` 9/9
- UX Gate: pending human (batched at epic end) — turbo feel with hysteresis, bot beatable by a human on both stages
- Delivery Handoff: PENDING
- Delivery PR: Pending
- Delivery Status: PENDING

## Autonomous Decisions
- DA-001: Hysteresis as a lockout flag set on emptying, cleared at turboReigniteFuel = 0.25 — Criteria: task (minimum fuel after empty, param in BASE_PARAMS) — Rationale: 0.25 = 0.75 s of turbo after 1.5 s of recharge; a partial tank released early re-ignites freely (no penalty for normal tapping).
- DA-002: Bot recalibrated via TUNING (errorRate {1.2, 0.4}, liftDuration [0.4, 0.9]) + Cerrado difficulty 0.9 — Criteria: CA-004 + epic DA-003 (Cerrado lower ratio) — Rationale: with turbo budget-limited for everyone, difficulty alone barely moved bot time (d 0..1 ratio 1.05–1.07, min seed within 0.3 s of the reference); throttle lifts are the costly error.
- DA-003: No golden regenerated — Criteria: task (regenerate only a case that hits Space held on empty) — Rationale: none does (throttle: no Space; turbo: infiniteTurbo; mixed: never empties).
- DA-004: Progress e2e keeps Estrada + Longa — Criteria: task — Rationale: hold-only sim 39.98 s vs bot min 44.65 s; measured e2e win 40.33 s vs 46.43 s.
- DA-005: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: contained mechanic fix with measured calibration.
