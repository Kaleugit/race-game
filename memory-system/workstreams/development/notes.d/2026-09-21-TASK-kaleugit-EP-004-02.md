# 2026-09-21 — TASK-kaleugit-EP-004-02

- main.js bot state: module-level `botCar`, `botDriver`, `raceIndex`, `currentStage` (set in setStage). Bot rebuilt in resetGame; stepped in tick only while `state.botFinishTime == null`; `state.botScroll` clamped to finishX.
- `renderBotBar()` owns #race-bar-bot position + turbo glow; EP-006 mini-map can read `botCar.state.x` / `state.botScroll`.
- When the player finishes first, `state.botFinishTime` comes from runBotToFinish (null past 180 s -> "—").
