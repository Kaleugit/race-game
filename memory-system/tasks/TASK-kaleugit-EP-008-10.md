# TASK-kaleugit-EP-008-10 - HUD: só distância do jogador + posição 1º/2º; contagem de 1 s

- Status: COMPLETED
- Priority: 1
- Description: Manager UX feedback (2026-09-22). See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 10.
- Depends On: TASK-kaleugit-EP-008-07
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-10-implement
- Workstreams: [development]
- Execution Mode: Quick
- Last Updated: 2026-09-22 14:19
- Started: 2026-09-22 14:10
- Completed: 2026-09-22 14:19
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-10-implement-report-2026-09-22.md
- prior-art: race HUD + race bar + shared :root UI tokens and hud-layout.spec.js (EP-008-07), drive.js keyboard dispatch on window (EP-006-05), ?dev debug key T infinite turbo (main.js)
- Evidence: PASS — `npm run test:sim` 109/109 (new race-position.test.js); `npm test` 21/21 (new race-position.spec.js: countdown "1" -> "VAI!" ~1 s, no #bot-dist, badges consistent with race-bar markers every frame, bot passes -> BOT 1º, player retakes -> VOCÊ 1º; hud-layout.spec.js now also includes the badges); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it
- UX Gate: pending human (batched at epic end) — screenshots memory-system/task-docs/TASK-kaleugit-EP-008-10-*.png
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: #34
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: Positions shown as badges on the race-bar labels (`[1º] VOCÊ ──── BOT [2º]`), leader badge filled gold, not in the HUD readout strip — Criteria: "keep it clean"; bar already names both racers — Rationale: position sits next to each racer's name and marker; HUD strip keeps only DIST.
- DA-002: Order rule = further x leads; tie keeps previous order; start = VOCÊ 1º (grid order); first to cross the line is locked 1º — Criteria: manager request + task scope — Rationale: no flicker at the start; matches the result.
- DA-003: Countdown = "1" (0.6 s) then "VAI!" (0.4 s), control at 1.0 s; "GO!" replaced by PT-BR "VAI!" — Criteria: 1 s total with a go beat — Rationale: PT-BR UI.
- DA-004: e2e uses the existing ?dev key T (infinite turbo) so the player retakes the lead deterministically — Criteria: flip must be proven without flakiness — Rationale: no new production hook.
- DA-005: No persona consults — Criteria: Quick mode, runbook — Rationale: contained UI change.
- Delivery Merged At: Pending
