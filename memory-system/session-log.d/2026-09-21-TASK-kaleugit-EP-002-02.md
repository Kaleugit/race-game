# 2026-09-21 — TASK-kaleugit-EP-002-02

- EP-002 Task 02: new `src/track/track-scene.js` (`createTrackScene` -> `update(scroll)`, `dispose()`) builds road/mud/ground/sky/finish portal/zone overlays from stage data; `src/main.js` uses `track.heightAt`/`track.finishX` and `?stage=<id>` via `setStage(id)`. `npm test` and `npm run test:sim` green; UX parity gate pending human.
