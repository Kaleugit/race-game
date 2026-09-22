# 2026-09-22 — TASK-kaleugit-EP-008-10

- race-hud API is now `{ configure, update, setPositions(playerFirst) }` (setBotDist and #bot-dist removed); pure `playerLeads(prev, playerX, botX, finishX)` exported from src/ui/race-hud.js. Badges `#race-pos-you` / `#race-pos-bot` inside the race-bar labels, `data-leader`.
- Countdown is 1 s total (main.js COUNTDOWN_S = 1, "VAI!" at 0.6 s). tests/e2e/race-position.spec.js uses `?stage=...&dev` + key T (infinite turbo) to make the player retake the lead deterministically.
