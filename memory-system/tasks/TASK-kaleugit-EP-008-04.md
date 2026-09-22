# TASK-kaleugit-EP-008-04 - Garage, profile and wiring for the new parts

- Status: COMPLETED
- Priority: 1
- Description: Garage selectors for engine/chassis/tank (index.html + src/ui/garage.js), profile save/load without destructive migration, main.js applies parts to physics/sound and tank capacity to the turbo HUD; e2e for persistence. See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 04.
- Depends On: TASK-kaleugit-EP-008-03, TASK-kaleugit-EP-006-05
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-04-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 15:00
- Started: 2026-09-22 11:05
- Completed: 2026-09-22 15:00
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-04-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-04-implement-report-2026-09-22.md
- prior-art: garage row pattern ([data-tire]/[data-gearbox], tireTradeoff/gearboxTradeoff) from EP-006-03 generalized to 5 part rows; profile sanitizeGarage (EP-006-01) extended; tests/e2e/drive.js helpers (EP-006-05) reused; ENGINES/CHASSIS/TANKS + resolveCarParams from EP-008-03
- Evidence: PASS — `npm run test:sim` 104/104; `npm test` 12/12 (new parts.spec.js: reload persistence + race HUD params + 640x360/740x360 fit); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it
- UX Gate: pending human (batched at epic end) — garage layout/labels, turbo bar length per tank, engine sound variants in race
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #30
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 15:00
## Autonomous Decisions
- DA-001: Short mobile landscape (max-height 500px) hides per-button trade-off labels and shows the selected option's label under each row; 2-column layout below 860px height — Criteria: task escalation "garage must fit mobile landscape" — Rationale: six rows with per-button labels need ~430px; this fits 640x360 with no scroll (e2e-proven) and every option's label is one tap away.
- DA-002: Engine label shows net acceleration (accelMult / mass) and turbo time (1 / turboBurnMult); chassis shows ACEL = 1 / mass — Criteria: "labels derived from presets" + honesty — Rationale: raw accelMult would advertise the 2.4 as +8% acceleration while it actually sprints slower (EP-008-03 DA-003).
- DA-003: Turbo HUD = bar of round(12 x turboCapacity) cells (8/12/17) — Criteria: "simple visible way" — Rationale: a bigger tank is a visibly longer bar.
- DA-004: #hud exposes data-engine/data-turbo-capacity/data-mass of the resolved params — Criteria: e2e must prove the parts reach the race — Rationale: DOM-only proof without a test-only global; values come from the same resolveCarParams call used by the physics.
- DA-005: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: contained UI/persistence wiring.
- Delivery Merged At: Pending
