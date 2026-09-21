# 2026-09-21 — TASK-kaleugit-EP-002-02

- Stage-dependent visuals live in `src/track/track-scene.js`; `src/main.js` keeps camera, lights, grid, car and physics. `let track, trackScene` are assigned by `setStage(id)` (called in the initLobby callback before `startCountdown`), so any code running before race start must not read `track`.
- Surface-zone overlays: one flat strip per zone, deformed once and translated with scroll (`palette.zones[type]`, fallback 0x888888).
- Unknown `?stage=` id warns and falls back to `getDefaultStage()`.
