# TASK-kaleugit-EP-006-05 - e2e for UI acceptance criteria (CA-001, CA-002, CA-006, CA-007)

- Status: COMPLETED
- Priority: 2
- Description: Add tests/e2e/flow.spec.js, progress.spec.js, result.spec.js, garage.spec.js covering CA-001/002/006/007 through the real UI; no src/ or index.html changes. See docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md Task 05.
- Depends On: TASK-kaleugit-EP-006-04
- Blocked By: None
- Branch: TASK-kaleugit-EP-006-05-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 03:28
- Started: 2026-09-22 03:10
- Completed: 2026-09-22 03:27
- Planning: memory-system/task-docs/TASK-kaleugit-EP-006-05-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-006-05-implement-report-2026-09-22.md
- prior-art: tests/e2e/smoke.spec.js (error collection + flow selectors), tests/sim/reference-driver.js (turbo policy reproduced by driveToFinish), tests/sim/bot.test.js (CA-007 bot half), src/ui/format.js formatDelta (imported by result.spec)
- Evidence: PASS — npm test 9/9 twice (flow x2, progress, result, garage + 4 existing); CA-002 Mata wins 70.95 s / 71.28 s vs bot 79.36 s / 79.06 s; npm run test:sim 86/86; no src/ or index.html in the diff
- UX Gate: pending human (batched at epic end)
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #25
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 03:27
## Autonomous Decisions
- DA-001: CA-002 win driven by the reference turbo policy (hold Space until #turbobar is empty, then toggle it every frame) instead of a held ArrowUp+Space — Criteria: orchestrator option (a) + task escalation (held input loses on Mata) — Rationale: real win through the real UI, no src/ change; the sim shows the held-Space loss comes from the blocked turbo recharge, not from air control.
- DA-002: Keys dispatched as KeyboardEvents on window from an in-page rAF loop — Criteria: determinism (frame-aligned toggle) — Rationale: Playwright's CDP keyboard cannot toggle once per frame; the game's listeners are the same.
- DA-003: Garage Estrada + Longa for the Mata races — Criteria: legal player choice, largest win margin in the sim (70.7 s) — Rationale: ~8 s margin over the bot; also exercises non-default parts.
- DA-004: REVANCHE covered on ?stage=teste-plano; the Mata flow covers the MAPA and GARAGEM exits — Criteria: e2e runtime — Rationale: same onRematch -> startCountdown path; saves one 75 s race.
- DA-005: CA-007 "bot does not inherit" cited from tests/sim/bot.test.js — Criteria: epic DA-008 — Rationale: no DOM representation of the bot params.
- DA-006: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: test-only task with fixed selectors.
- Delivery Merged At: Pending
