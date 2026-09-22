# 2026-09-21 — TASK-kaleugit-EP-006-04

- initLobby({ profile, stages, testStageId, onStart }) -> { openHome, openGarage, openMap }; ?stage=<id> makes JOGAR start that stage directly (e2e shortcut).
- main.js reads profile.getGarage() in resetGame (params, look, engine gearbox); finishRace -> recordWin on win -> showResult; leaveRace() pauses the race loop (menuOpen) and reopens a lobby screen.
- DOM ids created from JS: #hud-bot-won (bot finished first), #race-bar-stage (stage name).
