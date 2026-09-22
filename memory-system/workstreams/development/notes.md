# Personal Notes - development

## Session Notes (Consolidated)
Fragments source: `memory-system/workstreams/development/notes.d/*.md`.
Do not edit generated block manually.

<!-- WORKSTREAM_NOTES:START -->
# 2026-09-21 — TASK-kaleugit-EP-002-01

- Stage engine foundation: `src/track/track.js` (`createTrack`, `SURFACE_TYPES`, `FEATURE_TYPES`) and `src/stages/registry.js` are pure (no three/DOM); stages are auto-discovered from `src/stages/*.stage.js`.
- Node loads stages via `tests/sim/load-stages.js`; `npm run test:sim` = `node --test "tests/sim/*.test.js"` (directory arg fails on Node 24 Windows).
- CI requires a JSDoc `@module` in the first 8 lines of every changed `src/**/*.js`.


# 2026-09-21 — TASK-kaleugit-EP-002-02

- Stage-dependent visuals live in `src/track/track-scene.js`; `src/main.js` keeps camera, lights, grid, car and physics. `let track, trackScene` are assigned by `setStage(id)` (called in the initLobby callback before `startCountdown`), so any code running before race start must not read `track`.
- Surface-zone overlays: one flat strip per zone, deformed once and translated with scroll (`palette.zones[type]`, fallback 0x888888).
- Unknown `?stage=` id warns and falls back to `getDefaultStage()`.


# 2026-09-21 — TASK-kaleugit-EP-002-03

- Adding a stage = one `src/stages/<id>.stage.js` file; proven by `teste-plano` (hidden, order 99). Use `/?stage=teste-plano` for a short (finishX 200) race with sand [60,90) and mud [120,150) overlays.
- `tests/e2e/stage-data.spec.js` also fails if the "stage ... not found" fallback warning appears.


# 2026-09-21 — TASK-kaleugit-EP-003-01

- Physics API: `createCarPhysics({ track, params })` -> `{ state, step(dt, { up, down, left, right, space, locked }), reset() }`; `step` returns `{ chassisContact, landed, righted }` (`righted` always false until Task 02). State: x, speed, y, vy, rot, angVel, airborne, airTime, bounceLevel, lean, slopeRotVisual, suspY, suspVy, prevTrackH, fuel, turboActive, chassisLatched, finished, suspensionEnabled, infiniteTurbo.
- `tests/sim/car-physics.test.js` has golden checkpoints from the pre-extraction physics: any intended physics change (Task 02 crash removal, Task 03 grip) must keep them passing for default params or consciously re-record them.
- `tests/sim/harness.js` `runRace({ stage, params, driver, dt, maxTime, initialState })` stops on finish or first chassis contact (`crashed: true`).


# 2026-09-21 — TASK-kaleugit-EP-003-02

- `step` returns `{ chassisContact, landed, righted }` with a real `righted`. State: `chassisLatched` removed; `overturned`, `upsideDownTime` added. Params: `autoRightDelay` 1.5, `chassisFriction` 15, `chassisSettleRate` 6.
- Upside down = `cos(rot - atan(slopeAt(x))) < 0`; while upside down the wheel clamp is skipped (the chassis holds the car) and throttle/turbo are ignored.
- `tests/sim/harness.js` no longer stops on chassis contact; `crashed` = any contact; `rightedTimes` lists auto-rights.
- Righting leaves speed 0: on steep climbs a constant-`up` driver may stall (the EP-004 bot should back up or use turbo).


# 2026-09-21 — TASK-kaleugit-EP-003-03

- `import { TIRES, GEARBOXES, DEFAULT_PARTS, resolveCarParams } from './parts/presets.js'`; `resolveCarParams(BASE_PARAMS, { tire, gearbox, upgrades = [] })` -> frozen params; upgrades are `{ accelMult?, topSpeedMult? }` (EP-006 garage swaps the argument in src/main.js setStage).
- BASE_PARAMS gains `grip = { dirt: 1, mud: 0.8, sand: 0.75 }` (= Misto) and `surfaceDrag = { dirt: 0, mud: 0.3, sand: 0.35 }` (1/s, proportional to speed, ground only).
- Default car on teste-plano is now slowed in its sand/mud zones; mata-atlantica (all dirt) is unchanged.
- Sim fixture tests/sim/fixtures/areia.stage.js: dirt [0,100) + sand [100,300), finishX 300 (exports SAND_FROM/SAND_TO). EP-005-02 re-checks CA-008 on the real Cerrado.
<!-- WORKSTREAM_NOTES:END -->
