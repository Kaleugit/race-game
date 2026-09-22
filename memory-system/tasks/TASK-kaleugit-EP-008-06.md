# TASK-kaleugit-EP-008-06 - Garage parts panel redesign

- Status: COMPLETED
- Priority: 1
- Description: Manager UX feedback (2026-09-22): the garage parts panel looks bad and overlaps the lobby car, the garage background and the TELA CHEIA button. Keep the garage scene as is; redesign only the parts panel (layout, hierarchy, aesthetics) with the design-taste skills. No overlap with the car or TELA CHEIA at 1280x720, 1920x1080, 640x360, 740x360. Keep EP-008-04 contracts. See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 06.
- Depends On: TASK-kaleugit-EP-008-04
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-06-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 16:06
- Started: 2026-09-22 12:05
- Completed: 2026-09-22 16:06
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-06-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-06-implement-report-2026-09-22.md
- prior-art: garage rows/selectors and trade-off labels from EP-008-04 (kept), tests/e2e/drive.js helpers (EP-006-05), lobby camera/pointer code in src/lobby.js (EP-006-04)
- Evidence: PASS — `npm run test:sim` 104/104; `npm test` 16/16 (new garage-layout.spec.js: no dock intersects the car pixels or TELA CHEIA, no scroll, at 1280x720/1920x1080/640x360/740x360); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it
- UX Gate: pending human (batched at epic end) — garage docks look/feel; before/after screenshots in memory-system/task-docs/TASK-kaleugit-EP-008-06-*.png
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #32
- Delivery Status: MERGED

- Delivery Merged At: 2026-09-22 16:06
## Autonomous Decisions
- DA-001: Two docks (left top: MOTOR/CÂMBIO/PNEU + DESEMPENHO; right bottom: CHASSI/TANQUE/COR + CONFIRMAR) instead of one panel or category tabs — Criteria: no overlap with car/TELA CHEIA at 640x360, and the existing pickGarage helper clicks every row without opening tabs — Rationale: one side has only ~190 x 284 px on 640x360; splitting fits with no scroll and keeps every option one tap away.
- DA-002: Dock width from the viewport (50vw - 34vh - gutters) — Criteria: measured car box (~60vh side-on, up to ~67vh rotated) — Rationale: clears the car even when the player drag-rotates it.
- DA-003: Fixed the lobby rotation-on-mouse-move bug and disabled car zoom while garage/map are open (src/lobby.js) — Criteria: goal "panel must not overlap the car" — Rationale: any mouse move spun the car (up to its diagonal) and a click zoomed it 1.7x under the docks; drag-rotate and home-screen zoom still work.
- DA-004: Build summary (DESEMPENHO) computed in garage.js from the presets it receives (same products as resolveCarParams) — Criteria: garage.js takes data + callbacks only — Rationale: no game-logic import; notes.d records the sync point.
- DA-005: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: contained UI change; the design-critic agent reviewed taste instead.
- Delivery Merged At: Pending
