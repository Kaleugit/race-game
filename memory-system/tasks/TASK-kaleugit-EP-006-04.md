# TASK-kaleugit-EP-006-04 - Full flow, mini-map and wiring in src/main.js/src/lobby.js

- Status: COMPLETED
- Priority: 1
- Description: Wire Lobby -> Garage -> Map -> countdown -> race -> Result -> Rematch/Map/Garage; player params from profile garage; recordWin on victory; result opens when player finishes; race bar as mini-map with stage name; keep ?stage=<id> shortcut; remove location.reload and direct race_best_time use. Owns src/main.js and src/lobby.js in EP-006. See docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md Task 04.
- Depends On: TASK-kaleugit-EP-006-02, TASK-kaleugit-EP-006-03
- Blocked By: None
- Branch: TASK-kaleugit-EP-006-04-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 23:55
- Started: 2026-09-21 23:10
- Completed: 2026-09-21 23:55
- Planning: memory-system/task-docs/TASK-kaleugit-EP-006-04-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-006-04-implement-report-2026-09-21.md
- prior-art: src/main.js (EP-002-02 setStage(id) + dispose, EP-004-02 bot/race-bar wiring, showEndScreen being replaced); src/lobby.js (lobby render loop/music, reused and made reopenable); src/ui/{garage,stage-map,result}.js + src/profile/profile.js + applyCarLook in src/car.js (EP-006-01/02/03 APIs consumed as-is)
- Evidence: PASS — `grep -nE "showGarage|showStageMap" src/lobby.js` and `grep -nE "showResult|recordWin|getGarage" src/main.js` show the flow calls; `grep -n "location.reload\|race_best_time" src/main.js` empty; `npm run test:sim` green; `npm run build` PASS; `npm test` 4/4; scratch Playwright run over rematch / result -> garage -> map -> back -> race / in-race LOBBY with no console errors
- UX Gate: pending human (batched at epic end) — full flow on desktop and mobile landscape
- Delivery Handoff: PENDING
- Delivery PR: Pending
- Delivery Status: PR_OPEN

## Autonomous Decisions
- DA-001: HUD defeat notice (`#hud-bot-won`) and stage label (`#race-bar-stage`) are created from src/main.js instead of index.html markup — Criteria: epic ownership (index.html belongs to EP-006-03; editing it is an escalation) + orchestrator scope (index.html only to remove #end-lobby-btn) — Rationale: no new screen/text beyond RF-001, no index.html ownership conflict.
- DA-002: In-race `#btn-back-lobby` keeps its inline `onclick="location.reload()"` in index.html but main.js overrides it with `.onclick = leaveRace(openHome)` — Criteria: task (no location.reload in the flow) + DA-001 scope — Rationale: same effect as removing the attribute without widening the index.html edit.
- DA-003: e2e specs adjusted: smoke goes lobby -> garage -> map -> race; bot spec waits for `#hud-bot-won`, then drives to the finish; all drives hold ArrowUp+Space — Criteria: task done criteria ("ajustar esperas das specs para o novo momento do resultado, segurando ArrowUp+Space") — Rationale: the result now opens only when the player crosses; assertions unchanged.
- DA-004: Garage (params, look, engine gearbox) is read at every race start in resetGame (fresh createCarPhysics), so REVANCHE and the map path always use the saved choice — Criteria: KISS — Rationale: one read point instead of syncing on save.
- DA-005: The race loop keeps its requestAnimationFrame but skips stepping/rendering while the lobby screens are open (`menuOpen`) — Criteria: performance (one WebGL scene rendered at a time) — Rationale: same as before the first race.
- DA-006: 8 files touched (above the 6-file escalation threshold): 4 are e2e specs whose waits the task itself asks to adjust, plus docs/INDEX-API.md — Criteria: orchestrator instruction (spec updates allowed when the flow requires it) — Rationale: code change stays in main.js/lobby.js/index.html.
- DA-007: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: all APIs were specified by EP-006-01/02/03.
