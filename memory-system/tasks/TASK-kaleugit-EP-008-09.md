# TASK-kaleugit-EP-008-09 - Lobby com CORRIDA/GARAGEM + garagem em carrossel

- Status: COMPLETED
- Priority: 1
- Description: Manager UX feedback (2026-09-22). See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 09.
- Depends On: TASK-kaleugit-EP-008-06
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-09-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 14:20
- Started: 2026-09-22 13:50
- Completed: 2026-09-22 14:20
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-09-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-09-implement-report-2026-09-22.md
- prior-art: garage docks + stat bars + non-overlap car-pixel measurement (EP-008-06, tests/e2e/garage-layout.spec.js), shared :root UI tokens (EP-008-07), lobby flow initLobby -> { openHome, openGarage, openMap } (EP-006-04), e2e helpers tests/e2e/drive.js (EP-006-05)
- Evidence: PASS - `npm run test:sim` 104/104; `npm test` all green (new tests/e2e/lobby.spec.js: CORRIDA -> map -> race, map back -> lobby, GARAGEM -> carousel arrows/keyboard/pips/wrap -> PRONTO -> lobby with all 6 choices persisted and used by the race, result GARAGEM -> PRONTO -> lobby; garage-layout.spec.js now checks the card against the car and TELA CHEIA on EVERY slide at 1280x720/1920x1080/640x360/740x360); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it
- UX Gate: pending human (batched at epic end) - lobby buttons, carousel feel; before/after screenshots in memory-system/task-docs/TASK-kaleugit-EP-008-09-*.png
- Delivery Handoff: PENDING
- Delivery PR: Pending
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: `#lobby-play` keeps its id and becomes CORRIDA (stage map; with `?stage=<id>` it still starts that stage directly); new `#lobby-garage` = GARAGEM - Criteria: keep existing selectors - Rationale: every ?stage= spec keeps working unchanged.
- DA-002: Garage PRONTO (id `#garage-confirm`) always saves and returns to the lobby home, also when the garage was opened from the result screen; `#map-back` now returns to the lobby (was the garage) - Criteria: manager: "GARAGEM goes to the changes and back to the lobby" - Rationale: one mental model; CORRIDA is one click away on the lobby.
- DA-003: Carousel order MOTOR, CAMBIO, PNEU, CHASSI, TANQUE DE TURBO, COR (manager's list), wraps around, always opens on MOTOR; position = 6 clickable pips + "n/6" + the part name - Criteria: task scope - Rationale: pips fit the 182 px card at 640x360 where six names would not.
- DA-004: All slides share one CSS grid cell (inactive = visibility hidden), so the card keeps the tallest slide's height and PRONTO never moves; hidden slides' options are not clickable - Criteria: stable layout - Rationale: e2e helpers must navigate the carousel to reach each part (proves "one thing at a time").
- DA-005: DESEMPENHO kept as a compact 2x2 key/value summary under the slide (no bars) - Criteria: "compact summary may stay" - Rationale: the whole-car effect of a change stays visible without a 7th step.
- DA-006: Keyboard left/right (window listener only while the garage is open) and touch/pen swipe (>= 40 px, mostly horizontal; the click that ends a swipe is swallowed) switch slides - Criteria: cheap - Rationale: the game's own arrow-key state is released on keyup, the race is paused in menus.
- DA-007: No persona consults - Criteria: runbook (speed over ceremony) - Rationale: contained UI change.
