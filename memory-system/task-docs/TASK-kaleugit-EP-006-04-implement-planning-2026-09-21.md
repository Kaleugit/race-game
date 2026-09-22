# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-006-04
- Date: 2026-09-21 23:10
- Role/Skill: implement (no persona consults — runbook: speed over ceremony; APIs fully specified by EP-006-01/02/03)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-006-04-implement
- Depends On: TASK-kaleugit-EP-006-02, TASK-kaleugit-EP-006-03

## Summary
- Objective: wire Lobby -> Garagem -> Mapa -> Contagem -> Corrida -> Resultado -> (Revanche | Mapa | Garagem) in src/lobby.js and src/main.js, with the player car from the saved garage and progress through the profile.

## Scope
### In Scope
- src/lobby.js (menu flow, garage live preview, reopenable lobby), src/main.js (profile, garage params/look/gearbox, showResult, recordWin/getBest, HUD defeat notice, stage name on the race bar, no location.reload), index.html (remove hidden #end-lobby-btn only), e2e spec waits for the new result timing.

### Out of Scope
- UI modules (EP-006-03), car look (EP-006-02), physics, new e2e CAs (EP-006-05).

## Design
- `initLobby({ profile, stages, testStageId, onStart })` -> `{ openHome, openGarage, openMap }`. With `?stage=<id>`, JOGAR calls onStart directly (test shortcut).
- main.js: resetGame reads `profile.getGarage()` -> `createCarPhysics(resolveCarParams(BASE_PARAMS, garage))` + `applyCarLook`; engine `gearboxPreset = garage.gearbox`.
- Bot first -> HUD notice (`#hud-bot-won`, created in JS); player crossing -> finishRace -> recordWin on win -> showResult.
- MAPA / GARAGEM / in-race LOBBY -> leaveRace(): stop engine, hide race UI, pause the race loop (menuOpen), reopen the lobby screen.

## Acceptance Criteria
- AC-001: grep showGarage|showStageMap in src/lobby.js; showResult|recordWin|getGarage in src/main.js; no location.reload|race_best_time in src/main.js.
- AC-002: npm test 4/4 (specs adjusted only for the new flow/result timing).
- AC-003: npm run test:sim green.
- AC-004: Rematch / Map / Garage / in-race Lobby paths work without reload and without console errors (scratch Playwright run).
- AC-005 (human): full flow on desktop + mobile landscape — pending, batched at epic end.

## Escalation Check
- index.html edit limited to removing #end-lobby-btn (allowed by the orchestrator); HUD notice and stage label created from JS. No Mandatory Escalation Condition.

## Execution Plan
1. lobby.js flow. 2. main.js wiring. 3. e2e waits. 4. Verify, API index, delivery.
