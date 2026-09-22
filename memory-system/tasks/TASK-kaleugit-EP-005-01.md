# TASK-kaleugit-EP-005-01 - Polished Mata Atlantica (60-90s, hand-placed hazards) + duration test

- Status: COMPLETED
- Priority: 1
- Description: Edit only src/stages/mata-atlantica.stage.js (longer track, mud zones, bot difficulty); add generic tests/sim/stage-duration.test.js (CA-009 over listStages()), extend tests/sim/bot.test.js to all stages (CA-004), raise smoke e2e timeout to 150s. No engine or src/main.js edits; human UX gate on hazards and pacing. See docs/EPICO-EP-005-conteudo-estagios-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-004-02
- Blocked By: None
- Branch: TASK-kaleugit-EP-005-01-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 22:15
- Started: 2026-09-21 21:55
- Completed: 2026-09-21 22:15
- Planning: memory-system/task-docs/TASK-kaleugit-EP-005-01-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-005-01-implement-report-2026-09-21.md
- prior-art: tests/sim/reference-driver.js (createReferenceDriver) and tests/sim/harness.js (runRace) reused for CA-009; existing tests/sim/bot.test.js CA-004 body generalized over listStages(); existing stage contract / FEATURE_TYPES / mud surface (grip, surfaceDrag) used as-is; prototype opening of mata-atlantica kept verbatim
- Evidence: PASS — reference 73.70 s (CA-009 [60, 90]); bot d=0.5 seeds 1..10 median 79.42 s, spread +2.7%/-3.2%, all slower than reference (CA-004); `npm run test:sim` 56/56; `npm test` 3/3 (smoke 1.4 min); only src file changed: src/stages/mata-atlantica.stage.js
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: #18
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: Goldens repointed to a frozen copy of the old stage (tests/sim/fixtures/mata-atlantica-legacy.stage.js) instead of regenerating them — Criteria: task instruction (prefer frozen copy) + integrity (no loosened tolerance) — Rationale: the EP-002-01 height fixture comes from the pre-migration main.js and the EP-003-01 physics goldens from the pre-extraction physics; both are tied to the old track, not to the new level design. Fixture values unchanged, tolerance 1e-9 unchanged. New test pins the new stage's opening (x < 885) to the same fixture.
- DA-002: Prototype opening (0–830 m, incl. the steep 25 m serra climb and big jump) kept verbatim; new content appended from 885 m — Criteria: KISS + keep existing scenario tests meaningful — Rationale: the stall-recovery test at x=213 and the front-flip scenario still exercise the real stage.
- DA-003: bot.difficulty kept at 0.5 — Criteria: CA-004 — Rationale: median 79.4 s is 7.8% slower than the reference with a tight ±3% spread; Cerrado (Task 02) must be harder, so leave headroom.
- DA-004: Smoke e2e waits 150 s for #end-overlay, test timeout 210 s — Criteria: epic DA-004 — Rationale: the race ends when the bot finishes (~80 s game time; 1.4 min real locally); 150 s is ~1.9x margin without hiding a hang; the test-level timeout must exceed the wait.
- DA-005: mud zones get a palette color (0x3b2a1a) — Criteria: stage contract (palette.zones) — Rationale: without it overlays fall back to grey; data-only.
- DA-006: parts.test title updated (mata now has mud zones); assertion unchanged — Criteria: honesty of test names — Rationale: Misto+Padrão == BASE_PARAMS still holds on the real stage.
- UX Gate: pending human (batched at epic end) — hazard placement, pacing, big jumps, mud feel, bot difficulty, reference time 73.7 s.
- Delivery Merged At: Pending
