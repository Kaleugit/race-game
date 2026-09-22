# 2026-09-22 — TASK-kaleugit-EP-008-12

- New pure module `src/stages/hazard-signs.js`: `SIGN_LEAD_M` (20), `MIN_SIGN_X` (0), `hazardZones(stage)`, `hazardRuns(stage)`, `signPositions(stage) -> [{ x, type, hazardFrom }]`. Hazard = surface zone whose `type` differs from `surfaces.default`; terrain features are not hazards. Runs less than 20 m apart merge, so signs are always >= 20 m apart and never stack.
- `src/track/hazard-sign.js` `createHazardSign()` (flat-shaded low-poly: post + dark triangle + yellow face + box "!"); `SIGN_TUNING` frozen knobs at the top. `src/track/track-scene.js` places one per sign at `(x, track.heightAt(x), -4.2)` and scrolls it via `userData.x - scroll`, like the zone overlays. Decorative only — never read by physics.
- A new stage (including EP-008-13 free roam) gets its signs for free by declaring `surfaces.zones`; `tests/sim/hazard-signs.test.js` is generic over `loadStageModules()` so it covers new stages automatically.
- `tests/e2e/hazard-sign.spec.js` checks rendered pixels (clipped screenshot in a HUD-free band, sign-yellow signature: 0 with no sign in view, ~4400 with one) — no production test hook. Marked `test.slow()`.
