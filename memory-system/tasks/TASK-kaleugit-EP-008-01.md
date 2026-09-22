# TASK-kaleugit-EP-008-01 - Races 50% shorter

- Status: COMPLETED
- Priority: 1
- Description: Shorten mata-atlantica and cerrado stage data ~50% keeping each biome's signature sections; CA-009 now 30-45s in tests/sim/stage-duration.test.js; keep CA-004 (Cerrado harder = lower bot/reference ratio). Do not touch tests/e2e. See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-005-02
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-01-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 00:32
- Started: 2026-09-22 00:28
- Completed: 2026-09-22 00:32
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-01-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-01-implement-report-2026-09-22.md
- prior-art: src/stages/mata-atlantica.stage.js (EP-005-01 layout, verbatim 0–885 m opening kept) and src/stages/cerrado.stage.js (EP-005-02 layout) truncated/re-spliced; scratchpad tune.mjs (EP-005) reused for measurement
- Evidence: PASS — Mata 1400 m ref 39.68 s, bot median 42.77 s (ratio 1.078); Cerrado 1360 m ref 40.07 s, bot median 42.82 s (ratio 1.069); `npm run test:sim` 86/86; `./scripts/validate-changed.sh` PASS; `npm test` 4/4
- UX Gate: pending human (batched at epic end) — shorter stages keep each biome's feel and difficulty
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: #27
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: Mata keeps the full opening + riverbank + second serra and a shortened mud bog (finish 1400 m); kicker run, waterfall and river crossing removed — Criteria: task (keep abertura, serra, atoleiro) — Rationale: keeps the x<885 verbatim check and the x=213 stall scenario valid.
- DA-002: Cerrado keeps the first chapada and pulls the vereda sand stretch forward ([1030,1180)); second chapada and sand pan removed (finish 1360 m) — Criteria: task (uma chapada grande, areia) — Rationale: two sand zones >= 50 m keep CA-008 per-sand-zone checks meaningful.
- DA-003: Bot difficulty unchanged (0.5 / 0.6) — Criteria: CA-004 + epic DA-003 measured green — Rationale: no retune needed (ratios 1.078 vs 1.069).
- DA-004: No persona consults; bot.test.js and cerrado.test.js unchanged (their assertions do not depend on length) — Criteria: runbook (speed over ceremony) — Rationale: data-only change.
- Delivery Merged At: Pending
