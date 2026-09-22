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


# 2026-09-21 — TASK-kaleugit-EP-004-01

- `createBotDriver({ track, difficulty, seed, params? })` -> `{ decide(carState, dt) }` returning `{ up, down, left, right, space, locked: false }`; feed it `botCar.state` each frame. Tuning knobs in `TUNING` at the top of src/bot/bot-driver.js.
- `runBotToFinish({ car, driver, track, dt, maxTime, startTime })` returns the finish time on the race clock (pass the current race time as startTime) or null.
- `resolveBotParams(stage)` uses `stage.bot.parts ?? BOT_DEFAULT_PARTS` (misto/padrao).
- `createReferenceDriver(track)` in tests/sim/reference-driver.js is the harness driver for CA-004/CA-009.


# 2026-09-21 — TASK-kaleugit-EP-004-02

- main.js bot state: module-level `botCar`, `botDriver`, `raceIndex`, `currentStage` (set in setStage). Bot rebuilt in resetGame; stepped in tick only while `state.botFinishTime == null`; `state.botScroll` clamped to finishX.
- `renderBotBar()` owns #race-bar-bot position + turbo glow; EP-006 mini-map can read `botCar.state.x` / `state.botScroll`.
- When the player finishes first, `state.botFinishTime` comes from runBotToFinish (null past 180 s -> "—").


# 2026-09-21 — TASK-kaleugit-EP-005-01

- Mata Atlântica: finishX 2600; reference 73.70 s, bot d=0.5 median 79.42 s (ratio 1.078, spread ±3%), constant up 94.9 s, front-flip 109.8 s. Mud zones [930,1000) [1220,1390) [1940,1985) [2220,2300); palette.zones.mud 0x3b2a1a.
- Frozen old stage: tests/sim/fixtures/mata-atlantica-legacy.stage.js (id mata-atlantica-legacy, hidden) — physics goldens and the d399713 height fixture run on it; never edit.
- CA-009 / CA-004 are generic over listStages(): Cerrado (Task 02) is covered automatically; its median/reference ratio must be > 1.078 to be "harder".
- Reference pace is ~35 m/s on this kind of terrain: ~2600 m ≈ 74 s.


# 2026-09-21 — TASK-kaleugit-EP-005-02

- Cerrado: finishX 2800; reference 80.53 s, bot d=0.6 median 86.23 s (ratio 1.071), constant up 104.1 s, front-flip 121.4 s. Sand zones [270,440) [1180,1330) [2150,2280); palette ground 0x5a2616, sand 0xd9b27a. Max slope 0.71.
- "Harder" = lower bot/reference ratio (epic DA-003); the earlier "> 1.078" note was inverted.
- Local e2e with 4 specs flakes at the countdown under 4 workers; `npm test -- --workers=2` is reliable.


# 2026-09-21 — TASK-kaleugit-EP-006-01

- Profile API: createProfile(storage, listStages()) -> getGarage() {color,tire,gearbox} (no upgrades: feeds resolveCarParams directly), saveGarage, getUnlocked, isUnlocked, getBest(stageId), recordWin(stageId, time) -> {best, isNewBest, unlockedId}.
- Garage `color` is a CAR_COLORS id (default 'vermelho'); map to hex with getCarColor(id).hex for applyCarLook.
- profile.js must receive stages injected (stages/index.js uses import.meta.glob, Node-incompatible).


# 2026-09-21 — TASK-kaleugit-EP-006-02

- applyCarLook(carBuilt, { color, tire }): color = CAR_COLORS id or hex; tire = TIRES id; omitted fields unchanged; unknown ids throw. Also makeCar({ color, tire }).
- Works on makeCar()/makeBesouro() via their `look` handle; makeCarGLB() has none (returned unchanged).
- Per-tire visuals live in TIRE_LOOKS at the top of src/car.js (tuning knob for the UX gate).
- car.js can be imported in Node with a document/canvas stub (see tests/sim/car-look.test.js).


# 2026-09-21 — TASK-kaleugit-EP-006-03

- UI API: showGarage({selection, colors: CAR_COLORS, tires: TIRES, gearboxes: GEARBOXES, onChange, onConfirm}) / hideGarage; showStageMap({stages: listStages(), isUnlocked, onSelect, onBack?}) / hideStageMap; showResult({won, playerTime, botTime, bestTime, isNewBest?, onRematch, onMap, onGarage}) / hideResult; formatTime, formatDelta in src/ui/format.js.
- Overlays toggle via .show; buttons without callbacks are hidden; handlers assigned via onclick (safe to reopen every race).
- #end-lobby-btn is hidden but still present because src/main.js binds it at load — EP-006-04 removes both.


# 2026-09-21 — TASK-kaleugit-EP-006-04

- initLobby({ profile, stages, testStageId, onStart }) -> { openHome, openGarage, openMap }; ?stage=<id> makes JOGAR start that stage directly (e2e shortcut).
- main.js reads profile.getGarage() in resetGame (params, look, engine gearbox); finishRace -> recordWin on win -> showResult; leaveRace() pauses the race loop (menuOpen) and reopens a lobby screen.
- DOM ids created from JS: #hud-bot-won (bot finished first), #race-bar-stage (stage name).


# 2026-09-21 — TASK-kaleugit-EP-007-01

- `import { createEngineModel, ENGINE_DEFAULTS, scaleGearRatios } from './audio/engine-model.js'`; `createEngineModel({ gearboxPreset })` -> `{ update(dt, { speed, throttle, airborne }) -> { rpm, gear, load, shifting, firingHz }, reset(), gearRatios }`.
- `throttle` 0..1 (booleans accepted); `speed` sign ignored; load 0 while shifting, throttle*0.3 airborne. Call `reset()` on race restart.
- Gearbox preset id = the EP-003 GEARBOXES key (`curta`/`padrao`/`longa`); unknown id throws.


# 2026-09-21 — TASK-kaleugit-EP-007-02

- `initEngineSound()` -> `{ start, update(dt, { speed, throttle, airborne, turboActive, gearboxPreset }), stop }`; update is a no-op until start(); start()/stop() reset the engine model; changing gearboxPreset rebuilds it.
- Tuning knobs live at the top of src/sound.js (ORDERS table, MASTER_LEVEL, *_TAU); RPM/gear behavior lives in src/audio/engine-model.js.


# 2026-09-22 — TASK-kaleugit-EP-006-05

- tests/e2e/drive.js: trackErrors, openGarageFromLobby, pickGarage, confirmGarage, startStageFromMap, waitCountdown, driveToFinish (reference turbo policy, frame-aligned KeyboardEvents), resultSeconds.
- Holding Space on an empty tank blocks the recharge; `space: fuel > 0` (one-frame release) is the reference driver's whole advantage (Mata 93.0 s -> 73.7 s). Estrada + Longa is the fastest legal Mata setup (~71 s vs bot ~79 s).
- e2e suite ~5.4 min locally with workers 2.
<!-- WORKSTREAM_NOTES:END -->
