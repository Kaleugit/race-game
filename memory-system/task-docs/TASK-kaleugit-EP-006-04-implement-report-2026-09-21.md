# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-006-04
- Date Started: 2026-09-21 23:10
- Date Completed: 2026-09-21 23:55
- Role/Skill: implement
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-006-04-implement
- Planning Doc: TASK-kaleugit-EP-006-04-implement-planning-2026-09-21.md

## Summary
- src/lobby.js: `initLobby({ profile, stages, testStageId, onStart })` -> `{ openHome, openGarage, openMap }`. JOGAR -> showGarage (onChange = applyCarLook on the lobby car) -> confirm = profile.saveGarage + showStageMap -> onSelect = close lobby + onStart(id). #lobby-ui hidden while garage/map are open; map back -> garage. The lobby reopens (render loop + music) without reload. `?stage=<id>` -> JOGAR starts that stage directly.
- src/main.js: `profile = createProfile(localStorage, listStages())`; every race start (resetGame) reads getGarage() for params (resolveCarParams), look (applyCarLook) and engine gearboxPreset. Result via showResult (REVANCHE = same stage, MAPA/GARAGEM reopen the lobby screens); win -> recordWin (best + unlock), loss -> getBest. Bot crossing first shows `#hud-bot-won` ("BOT CHEGOU — DERROTA"); the result opens when the player crosses. The race bar shows the stage name (`#race-bar-stage`). In-race LOBBY button rebound to the lobby home (no reload). Race loop paused while the menus are open.
- index.html: hidden #end-lobby-btn and its CSS removed.
- e2e: smoke now goes lobby -> garage -> map -> race; bot spec waits for the HUD notice, then drives to the finish; all drives hold ArrowUp+Space (task done criteria).

## Acceptance Criteria Status
| Criterion | Result | Evidence |
|---|---|---|
| AC-001 greps | PASS | showGarage/showStageMap in lobby.js; showResult/recordWin/getGarage in main.js; no location.reload/race_best_time in main.js |
| AC-002 e2e | PASS | npm test 4/4 (2.4 min) |
| AC-003 sim | PASS | npm run test:sim, 0 failures |
| AC-004 other paths | PASS | scratch Playwright run: rematch; result -> garage (color/tire/gearbox saved in race_profile_v1) -> map (cerrado locked) -> back -> Mata race with the look applied + stage name; in-race LOBBY -> lobby home; no console errors |
| AC-005 human UX | PENDING | batched at epic end |

## Test Evidence
- `npm run test:sim` -> PASS; `npm run build` -> PASS; `npm test` -> PASS (4/4)
- `./scripts/validate-changed.sh` -> PASS
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it

## Notes for EP-006-05
- Flow selectors: #lobby-play -> #garage-overlay.show (#garage-confirm) -> #map-overlay.show ([data-stage-id]) -> #countdown-overlay -> #end-overlay.show; #hud-bot-won visible when the bot finished first; #race-bar-stage = stage name.
- Headless constant-drive times (up+space): Mata 93.0 s, Cerrado 102.2 s, teste-plano 6.6 s (bot ~6.6 s, so a teste-plano win is not guaranteed).
- A win on a ?stage= shortcut race is recorded too (teste-plano appears in progress.unlocked; harmless, hidden stage).

## Files Changed
- src/lobby.js, src/main.js, index.html, tests/e2e/{smoke,bot,cerrado,stage-data}.spec.js, docs/INDEX-API.md, docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md, task file, planning/report/validation notes, fragments
