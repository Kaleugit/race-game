# TASK-kaleugit-EP-006-03 - Screens: garage, stage map and result

- Status: COMPLETED
- Priority: 1
- Description: Add #garage-overlay, #map-overlay, #end-delta, #end-map, #end-garage (REVANCHE keeps #end-play-again, remove #end-lobby-btn) in index.html; create src/ui/format.js (formatTime, formatDelta), src/ui/garage.js, src/ui/stage-map.js, src/ui/result.js taking data + callbacks only. Owns index.html in EP-006; human UX gate on layout incl. mobile landscape. See docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md Task 03.
- Depends On: TASK-kaleugit-EP-006-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-006-03-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 23:15
- Started: 2026-09-21 23:00
- Completed: 2026-09-21 23:15
- Planning: memory-system/task-docs/TASK-kaleugit-EP-006-03-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-006-03-implement-report-2026-09-21.md
- prior-art: index.html (#end-overlay / #lobby-play HUD button style: Courier New, #ffd86b borders, 2px 2px 0 #000 shadow); src/main.js:243-360 (current end screen fill and #end-lobby-btn binding, left intact); src/parts/colors.js + src/parts/presets.js (data shapes rendered by the garage)
- Evidence: PASS — tests/sim/format.test.js 7/7 (formatDelta(10, 8.66) === '+1.34s', formatDelta(8, 8.8) === '-0.80s', formatDelta(5, 5) === '+0.00s', never '-0.00s'); `npm run test:sim` 80/80; `grep -nE "from '\.\./main|physics|profile" src/ui/*.js` empty; `npm run build` PASS; `npm test` 4/4 (overlays hidden by default, current flow unchanged); Playwright render at 1280x720 and 740x360 (touchpad shown): garage/map/result fit, callbacks fire (onChange/onConfirm, locked stage ignores click, data-seconds + delta set), no console errors
- UX Gate: pending human (batched at epic end) — layout of the three screens on desktop and mobile landscape with touch controls
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: pending
- Delivery Status: PENDING

## Autonomous Decisions
- DA-001: `#end-lobby-btn` kept in index.html with `hidden` instead of removed — Criteria: orchestrator instruction + CDC-005 (do not break the running flow) — Rationale: src/main.js:257 calls `document.getElementById('end-lobby-btn').addEventListener`; removing it would throw at load. EP-006-04 removes the binding, then the element.
- DA-002: Option lists (swatches, tires, gearboxes, stages) are rendered by src/ui/* from the data passed in, into static containers in index.html — Criteria: epic DA-006 (UI takes data + callbacks) — Rationale: no duplicated preset data in HTML; `[data-color-id]`/`[data-tire]`/`[data-gearbox]`/`[data-stage-id][data-locked]` exist once the screen is shown.
- DA-003: Trade-off labels derived from preset numbers (e.g. "VEL +5% · TERRA 100% · LAMA 60% · AREIA 55%", "ACEL +15% · VEL −7%") — Criteria: RF-008/RF-009 + CDC-102 (transparent trade-off) — Rationale: stays correct if presets are retuned.
- DA-004: Garage is a right-side panel over the lobby (not full screen) — Criteria: epic Task 04 (live preview on the lobby car via applyCarLook) — Rationale: the car stays visible while choosing. EP-006-04 should hide #lobby-ui (title/JOGAR) while garage/map are open.
- DA-005: `#end-delta`, `#end-map`, `#end-garage` start `hidden`; showResult reveals the delta and each button only when its callback is given; handlers assigned via `onclick` (not stacked) — Criteria: orchestrator instruction (current flow + 4 e2e unchanged) — Rationale: main.js is not wired yet.
- DA-006: Extra exports beyond the listed API: `hideResult`, `tireTradeoff`, `gearboxTradeoff`, optional `onBack` (#map-back) and `isNewBest` in showResult; helper module src/ui/dom.js — Criteria: KISS + EP-006-04 needs (Mapa -> back to Garagem, best-time highlight) — Rationale: small, optional, no change for existing code.
- DA-007: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: fully specified UI shapes; verified by render.
