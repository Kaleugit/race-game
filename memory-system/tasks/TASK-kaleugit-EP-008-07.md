# TASK-kaleugit-EP-008-07 - Race HUD standardization + speed/turbo gauges

- Status: COMPLETED
- Priority: 1
- Description: Manager UX feedback (2026-09-22): in the race screen, VEL, DIST, TURBO, the BOT race bar, controls and buttons must use the same font and sizes as the start screens (lobby/garage, after Task 06). Speed and turbo become semi-transparent gauges; the turbo gauge still reflects tank capacity. Test on desktop and mobile landscape (touch controls must not be covered). See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 07.
- Depends On: TASK-kaleugit-EP-008-06
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-07-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 13:33
- Started: 2026-09-22 12:20
- Completed: 2026-09-22 13:33
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-07-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-07-implement-report-2026-09-22.md
- prior-art: garage dock style + type scale (EP-008-06, index.html "Garage (EP-008-06)"), turbo cells = round(12 x turboCapacity) and #hud data-* (EP-008-04), turbo lockout / reignite 25% (EP-008-05), garage-layout.spec.js rect-intersection pattern (EP-008-06)
- Evidence: PASS — `npm run test:sim` 104/104; `npm test` 20/20 (new hud-layout.spec.js: HUD, race bar, in-race buttons and the 4 touch buttons never intersect and stay in the viewport at 1280x720/1920x1080/640x360/740x360 with touch on and the bot-won notice shown; parts.spec.js now proves 17 drawn turbo segments for Grande); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it
- UX Gate: pending human (batched at epic end) — HUD gauges look/readability, touch controls; before/after screenshots in memory-system/task-docs/TASK-kaleugit-EP-008-07-*.png
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: #33
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: Shared CSS tokens on :root (--ui-font, --ui-fs, --ui-gold, --ui-muted, --ui-panel-bg, --ui-panel-border, ...) used by the garage docks and the race UI; garage values unchanged — Criteria: DRY + "same font and size as the start screens" — Rationale: one source for the type scale; garage-layout e2e still green.
- DA-002: Turbo gauge = arc of round(12 x turboCapacity) constant-size segments centred at 12 o'clock (Pequeno 8 / Médio 12 / Grande 17), so a bigger tank is a longer arc — Criteria: keep EP-008-04 capacity semantics visible — Rationale: capacity readable at a glance; parts.spec asserts 17 drawn segments (replaces the 17-cell text check, same proof).
- DA-003: Turbo lockout (EP-008-05) shown as red segments + "RECARGA" + a tick at the 25% reignite level — Criteria: cheap — Rationale: explains why Space does nothing after emptying the tank.
- DA-004: Layout = HUD column top-left, action buttons column top-right, race bar fills the gap between them (max ~40em, centred) — Criteria: no overlap at 640x360 — Rationale: all sized in em of --ui-fs, so the three columns scale together; touch pads stay at the bottom corners.
- DA-005: Touch controls restyled (square, UI font, FREIO / TURBO / ACEL labels) but kept thumb-sized in px; keyboard hint hidden while touch is on (it overlapped the left pad) — Criteria: manager asked controls standardized; touch targets must stay usable — Rationale: labels at min(--ui-fs, 12px) fit the pedals at every size.
- DA-006: In-race buttons blur after a click (Space = turbo would otherwise re-press a focused TOUCH/REINICIAR button) and hover styles apply only on hover-capable devices — Criteria: bug found while testing — Rationale: one-line fix, no other behavior change.
- DA-007: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: contained UI change.
- Delivery Merged At: Pending
