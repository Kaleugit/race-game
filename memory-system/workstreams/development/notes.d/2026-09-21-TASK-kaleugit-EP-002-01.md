# 2026-09-21 — TASK-kaleugit-EP-002-01

- Stage engine foundation: `src/track/track.js` (`createTrack`, `SURFACE_TYPES`, `FEATURE_TYPES`) and `src/stages/registry.js` are pure (no three/DOM); stages are auto-discovered from `src/stages/*.stage.js`.
- Node loads stages via `tests/sim/load-stages.js`; `npm run test:sim` = `node --test "tests/sim/*.test.js"` (directory arg fails on Node 24 Windows).
- CI requires a JSDoc `@module` in the first 8 lines of every changed `src/**/*.js`.
