# TASK-kaleugit-EP-005-02 - Cerrado stage (sand/red earth, harder bot)

- Status: COMPLETED
- Priority: 1
- Description: Add only src/stages/cerrado.stage.js (order 2, /img/cerrado.jpg, red-earth palette, distinct relief, sand zones, higher bot difficulty); tests/sim/cerrado.test.js (CA-008 offroad faster than estrada on real sand; bot/reference ratio lower than Mata) and tests/e2e/cerrado.spec.js. CA-003/CA-004/CA-009 must pass. See docs/EPICO-EP-005-conteudo-estagios-TASKS.md Task 02.
- Depends On: TASK-kaleugit-EP-005-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-005-02-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 01:41
- Started: 2026-09-21 22:20
- Completed: 2026-09-22 01:41
- Planning: memory-system/task-docs/TASK-kaleugit-EP-005-02-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-005-02-implement-report-2026-09-21.md
- prior-art: stage contract and the teste-plano sand zone/palette pattern (src/stages/teste-plano.stage.js); CA-008 pattern from tests/sim/parts.test.js; generic CA-004/CA-009 tests from EP-005-01 (tests/sim/bot.test.js, tests/sim/stage-duration.test.js); e2e pattern from tests/e2e/stage-data.spec.js and smoke.spec.js
- Evidence: PASS — Cerrado reference 80.53 s (CA-009); bot d=0.6 seeds 1..10 median 86.23 s (84.4–88.6), all slower than the reference (CA-004); bot/reference ratio 1.071 < Mata 1.078; Off-road crosses every sand zone faster than Estrada (6.53 vs 9.28 s, 5.77 vs 8.02 s, 4.98 vs 6.88 s); `npm run test:sim` 63/63; `npm test -- --workers=2` 4/4; only src file added: src/stages/cerrado.stage.js
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #19
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 01:41
## Autonomous Decisions
- DA-001: "Bot a little harder" = bot/reference ratio LOWER than Mata's (1.071 < 1.078), bot.difficulty 0.6 > 0.5 — Criteria: epic DA-003 + Task 02 description ("razão ... < mesma razão na Mata") — Rationale: a harder bot is closer to the reference time; the EP-005-01 note / dispatch phrasing "ratio > 1.078" is inverted relative to the epic, which is the source of truth. Ratio stays > 1 (every seed slower than the reference, CA-004).
- DA-002: Red earth is the ground color (palette.ground 0x5a2616), not a surface zone — Criteria: epic scope (no new surface types: dirt|mud|sand) — Rationale: red dirt has plain dirt traction; loose sand (palette.zones.sand 0xd9b27a) is the traction-changing surface.
- DA-003: CA-008 on Cerrado asserts Off-road < Estrada per sand zone (time to cross [from, to)) with >= 3% margin, plus every part swap moves race time or max speed by >= 3% — Criteria: tests/sim/parts.test.js pattern — Rationale: whole-race time with constant up is dirt-dominated (Estrada 107.2 s vs Off-road 108.4 s), so the sand stretch is the meaningful measure, as the epic states.
- DA-004: Local e2e evidence at --workers=2; playwright.config.js unchanged — Criteria: known local GPU-contention flake, scope (data + tests) — Rationale: with 4 specs (two 60–90 s races) on 4 workers, one spec failed the 5 s countdown `show` check in each run; all 4 pass at 2 workers and cerrado.spec.js passes alone. CI does not run e2e.
- UX Gate: pending human (batched at epic end) — Cerrado background/palette/sand look, relief, bot difficulty, performance, reference time 80.5 s.
- Delivery Merged At: Pending
