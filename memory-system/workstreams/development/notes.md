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


# 2026-09-22 — TASK-kaleugit-EP-008-01

- Mata finishX 1400: opening 0–885 m verbatim, mud [930,1000) + [1220,1320). Cerrado finishX 1360: sand [270,440) + [1030,1180), one chapada (520 climb / 820 drop).
- Bot difficulty unchanged (0.5 Mata, 0.6 Cerrado). CA-009 bounds 30–45 s in tests/sim/stage-duration.test.js.


# 2026-09-22 — TASK-kaleugit-EP-008-02

- Engine sound gearing: finalDrive 3.3 (was 4.5). Top gear at maxSpeedTurbo ~2620 rpm; full turbo tops out in 4th on Mata Atlântica. Engine variants (EP-008-03) can override `finalDrive`/`redlineRpm` via createEngineModel options.
- tests/sim/engine-model.test.js keeps a LEGACY `{ finalDrive: 4.5 }` baseline for the ">= 1.3x per gear" and "fewer upshifts" checks.


# 2026-09-22 — TASK-kaleugit-EP-008-03

- BASE_PARAMS.mass divides throttle/turbo accel, AIR_TORQUE and the landing rebound; BASE_PARAMS.turboCapacity divides TURBO_DEPLETE/TURBO_RECHARGE (fuel stays 0..1). Engines also scale TURBO_DEPLETE (turboBurnMult).
- resolveCarParams(base, { tire, gearbox, engine?, chassis?, tank? }): missing new parts = DEFAULT_PARTS, so profile.getGarage() (still color/tire/gearbox) keeps working until EP-008-04.
- EP-008-04 wiring: engineSound.update(dt, { ..., engine: garage.engine }); turbo HUD can show seconds = params.turboCapacity / params.TURBO_DEPLETE; labels in ENGINES/CHASSIS/TANKS[id].label.


# 2026-09-22 — TASK-kaleugit-EP-008-04

- profile.getGarage() -> { color, tire, gearbox, engine, chassis, tank } (always valid ids; safe for resolveCarParams). race_profile_v1 version stays 1.
- showGarage({ selection, colors, tires, gearboxes, engines, chassis, tanks, onChange, onConfirm }); rows #garage-engines [data-engine], #garage-chassis [data-chassis], #garage-tanks [data-tank]; .garage-sel-trade shows the selected label (visible only at max-height 500px).
- #hud data-engine / data-turbo-capacity / data-mass = resolved params of the current race; #turbobar cells = round(12 x turboCapacity).
- tests/e2e/drive.js pickGarage accepts engine/chassis/tank.


# 2026-09-22 — TASK-kaleugit-EP-008-05

- BASE_PARAMS.turboReigniteFuel 0.25; car state.turboLockout (set when the tank empties while burning, cleared at >= turboReigniteFuel). Tank recharges whenever turboActive is false.
- Bot TUNING errorRate {1.2, 0.4}, liftDuration [0.4, 0.9]; difficulty Mata 0.5, Cerrado 0.9. Difficulty has a weak/noisy effect now.
- EP-008-03 tanks: a smaller/larger tank should keep turboReigniteFuel meaningful (fraction of capacity).


# 2026-09-22 — TASK-kaleugit-EP-008-06

- Garage DOM: `#garage-panel` (left dock: #garage-engines, #garage-gearboxes, #garage-tires, #garage-summary) and `#garage-side` (right dock: #garage-chassis, #garage-tanks, #garage-colors, #garage-confirm). All data-* selectors unchanged; `.opt-trade` is screen-reader text; `.garage-sel-trade` (+ `.garage-stats`) holds `.stat[data-tone]` rows and is visible at every size.
- Dock width = min(420px, 50vw - 34vh - 2 gutters): the lobby car is ~60vh long side-on (VIEW_H fixed), <= ~67vh when drag-rotated. Changing the lobby camera/VIEW_H or car size means re-checking tests/e2e/garage-layout.spec.js.
- garage.js exports partStats(kind, item) and buildStats(parts) (mirrors resolveCarParams products); keep in sync if resolveCarParams changes.
- lobby.js: rotation only while a canvas press is held; enterZoom skipped while #lobby-ui is hidden (garage/map open).


# 2026-09-22 — TASK-kaleugit-EP-008-07

- UI tokens live on :root in index.html (--ui-font, --ui-fs, --ui-gold, --ui-muted, --ui-panel-bg, --ui-panel-border, --ui-glass-bg, --ui-face, --ui-bot...). Garage docks and race UI both use them; change the type scale there.
- Race layout: `.race-ui` sets --hud-gut / --hud-w (18.4em) / --act-w (9.6em); #race-bar left/right are computed from them. Resizing the gauges or buttons means updating these and re-running tests/e2e/hud-layout.spec.js.
- src/ui/race-hud.js owns #speed (SVG text), #dist, #bot-dist and the gauges; #turbobar no longer exists. Tank capacity is visible as `#turbo-gauge[data-segments]` + `.turbo-seg` count; `data-state` = idle|low|active|lockout, `data-filled` = lit segments.
- Touch controls are enabled by #mobiletoggle / TELA CHEIA (class .show on #touchpad), not auto-detected.


# 2026-09-22 — TASK-kaleugit-EP-008-08

- ENGINES sound order is now 2.4 = higher-revving/brighter (redline 4400, timbre 1.12), 1.6 = deeper (redline 3700, timbre 0.88); 2.0 unchanged. tests/sim/parts-rf012.test.js encodes this order.


# 2026-09-22 — TASK-kaleugit-EP-008-09

- Lobby: `#lobby-play` = CORRIDA (map; `?stage=<id>` starts that stage directly), `#lobby-garage` = GARAGEM. Garage PRONTO (`#garage-confirm`) saves and returns to the lobby (from the result screen too); `#map-back` returns to the lobby.
- Garage = one `#garage-card` carousel; `GARAGE_SLIDES` (src/ui/garage.js) = engine, gearbox, tire, chassis, tank, color; current slide in `#garage-card[data-slide]`, `#garage-cat`, `#garage-step` "n/6", `#garage-pips [aria-current="step"]`. Only the active slide is visible/clickable.
- e2e: use drive.js `openGarageFromLobby`, `goToGarageSlide`, `pickGarage` (navigates), `confirmGarage` (asserts lobby), `openMapFromLobby`, `startStageFromMap`. Adding a garage part = new slide in index.html + GARAGE_SLIDES + drive.js GARAGE_FIELDS.


# 2026-09-22 — TASK-kaleugit-EP-008-10

- race-hud API is now `{ configure, update, setPositions(playerFirst) }` (setBotDist and #bot-dist removed); pure `playerLeads(prev, playerX, botX, finishX)` exported from src/ui/race-hud.js. Badges `#race-pos-you` / `#race-pos-bot` inside the race-bar labels, `data-leader`.
- Countdown is 1 s total (main.js COUNTDOWN_S = 1, "VAI!" at 0.6 s). tests/e2e/race-position.spec.js uses `?stage=...&dev` + key T (infinite turbo) to make the player retake the lead deterministically.


# 2026-09-22 — TASK-kaleugit-EP-008-11

- `src/bot/ghost-car.js`: `createGhostCar({ scene, look })` -> `{ setEnabled(on), update(botState, playerX, dt, halfWidth), dispose() }`, frozen `GHOST_TUNING` (opacity, tint, tintMix, emissive, cullMargin, renderOrder). Screen x of any world object = `worldX - playerX` (the camera keeps the player at world x = 0). Built lazily in main.js `setUpGhost()` on the first race with the option on; `#hud[data-ghost]` exposes the state.
- `profile.js` now stores `settings: { ghostBot }` beside garage/progress: `getSettings()` / `saveSettings(partial)`, `DEFAULT_SETTINGS` exported, still version 1 and non-destructive (missing/invalid = default, reading never rewrites the JSON). `tests/sim/profile.test.js` pins the stored shape, so a new option has to be added there on purpose.
- Map screen carries pre-race options now: `showStageMap({ ..., ghostBot, onGhostToggle })` renders `#map-ghost` / `#map-ghost-value`; `tests/e2e/map-layout.spec.js` proves non-overlap + no scrolling at 1280x720, 1920x1080, 640x360 and 740x360 in both states.
- `tests/e2e/ghost-bot.spec.js` samples real pixels on `teste-plano` (cold-blue signature in the road band `{x:0,y:400,w:1280,h:260}`, player holding ArrowUp so the ghost stays on screen ~3 s): on = 2600–10100 px/frame, off = 0. Recalibrate if the camera, VIEW_H, GHOST_TUNING or that stage's background change.


# 2026-09-22 — TASK-kaleugit-EP-008-12

- New pure module `src/stages/hazard-signs.js`: `SIGN_LEAD_M` (20), `MIN_SIGN_X` (0), `hazardZones(stage)`, `hazardRuns(stage)`, `signPositions(stage) -> [{ x, type, hazardFrom }]`. Hazard = surface zone whose `type` differs from `surfaces.default`; terrain features are not hazards. Runs less than 20 m apart merge, so signs are always >= 20 m apart and never stack.
- `src/track/hazard-sign.js` `createHazardSign()` (flat-shaded low-poly: post + dark triangle + yellow face + box "!"); `SIGN_TUNING` frozen knobs at the top. `src/track/track-scene.js` places one per sign at `(x, track.heightAt(x), -4.2)` and scrolls it via `userData.x - scroll`, like the zone overlays. Decorative only — never read by physics.
- A new stage (including EP-008-13 free roam) gets its signs for free by declaring `surfaces.zones`; `tests/sim/hazard-signs.test.js` is generic over `loadStageModules()` so it covers new stages automatically.
- `tests/e2e/hazard-sign.spec.js` checks rendered pixels (clipped screenshot in a HUD-free band, sign-yellow signature: 0 with no sign in view, ~4400 with one) — no production test hook. Marked `test.slow()`.


# 2026-09-22 — TASK-kaleugit-EP-008-13

- Stage contract: optional `mode` field, validated in `src/stages/registry.js` (`STAGE_MODES = ['race', 'free']`, `stageMode(stage)`, `isFreeRoam(stage)`; missing = `race`). A `mode: 'free'` stage is `hidden` and carries no `bot` block, so it never reaches `listStages()`, the unlock ladder or the CA-004/CA-009 sim tests.
- `src/stages/terra-livre.stage.js` (id `terra-livre`, 5000 m): ten hand-placed 500 m sections, 20 non-overlapping elevation ramps (net ~+1 m, range 44 m, max slope 0.703 vs Mata's 0.86), 69 features using all five kinds, 21 mud/sand zones at least 20 m apart (so each gets its own EP-008-12 sign; first hazard at 140 m, first sign at 120 m). Reference input finishes in ~158 s with no stall. Background `/img/cloud-forest-landscape.jpg`, `mudLayer: false`.
- `src/stages/livre-teste.stage.js` (180 m, hidden, `mode: 'free'`): the `teste-plano` twin used by the e2e to reach the free-roam end screen in seconds. `?stage=livre-teste`.
- `src/main.js`: one `state.freeRoam` flag set in `setStage` from the stage data. Free roam skips the bot physics instance entirely (`botCar`/`botDriver` stay null — `renderBotBar` and the ghost update are guarded), never adds `.show` to `#race-bar`, forces `setUpGhost` off, shows MODO LIVRE in `#countdown-vs`, and calls `finishFreeRoam()` (never `finishRace`/`recordWin`). `#hud[data-mode="free"|"race"]` is the e2e hook.
- `src/ui/free-end.js`: `showFreeEnd({ distance, time, onAgain, onBack })` / `hideFreeEnd()` over `#free-end-overlay` (`#free-end-dist[data-metres]`, `#free-end-time[data-seconds]`, `#free-end-again`, `#free-end-back`). Data + callbacks only, like the other screen modules. `hideFreeEnd()` also runs in `resetGame` and `leaveRace`.
- `src/ui/stage-map.js`: `showStageMap({ ..., freeStage, onFree })` shows `#map-free` (teal, infinity mark, `data-stage-id`, `#map-free-sub` = "5.0 km · SEM ADVERSÁRIO"); hidden when either is absent. `initLobby({ ..., freeStage })` passes `getStage('terra-livre')` from `src/main.js` (`FREE_STAGE_ID`).
- e2e helpers added to `tests/e2e/drive.js`: `startFreeRoamFromMap`, `driveFreeRoamToEnd`, `driveForMs`, `readProfile`; `driveToFinish` now shares an internal `holdThrottleUntil(page, endId)` with the free-roam variant (same ArrowUp+Space policy).
- `tests/e2e/map-layout.spec.js` now includes `#map-free` in the pairwise non-overlap/in-viewport set at all four viewports and asserts its border colour differs from the stage rows, so the "visually distinct" requirement cannot silently regress.
- Free roam is proven not to write: the specs compare the raw `race_profile_v1` string before and after the run (it stays `null` on a fresh profile).


# 2026-09-22 — TASK-kaleugit-EP-008-14

- `E2E_PORT=<port> npm test` picks the preview port (default 4173). Nothing else hardcodes 4173.
- The governance workflow does NOT run e2e (validate-all only) — the local `npm test` before delivery is the only end-to-end evidence.
<!-- WORKSTREAM_NOTES:END -->
