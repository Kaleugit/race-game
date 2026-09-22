# Accumulated inter-task context

## EP-001 (merged #4)
- `npm test` = Playwright e2e against build+preview (port 4173); tests/e2e/smoke.spec.js drives #lobby-play -> #countdown-overlay -> ArrowUp -> #end-overlay (.show), fails on pageerror/console.error.

## EP-002-01 (merged #5)
- API: `import { getDefaultStage, getStage, listStages } from './stages/index.js'` (import.meta.glob './*.stage.js'); `import { createTrack, SURFACE_TYPES, FEATURE_TYPES } from './track/track.js'`. `createTrack(stage)` -> `{ heightAt, slopeAt, surfaceAt, finishX }`.
- Stage file: `src/stages/<id>.stage.js` default export; validated by `validateStage` in src/stages/registry.js. `hidden: true` stages reachable via getStage(id), omitted from listStages. Zones half-open [from,to), from<to, first match wins; surfaceAt returns 'dirt' outside zones.
- Mata Atlântica: visuals.background '/img/misty-tropical-jungle.jpg', visuals.mudLayer true, palette.ground 0x1a2818, palette.zones {}; no physical zones (mud visual only).
- tests/sim/load-stages.js loads stages in Node; height fixture tests/sim/fixtures/mata-atlantica-heights.json (from d399713).

## EP-002-02 (merged #6)
- src/track/track-scene.js: `createTrackScene({ scene, skyScene, stage, track })` -> `{ update(scroll), dispose() }`; builds road, mud (if visuals.mudLayer), ground, sky, finish portal, zone overlays colored by visuals.palette.zones[type] (fallback 0x888888).
- src/main.js: `track`/`trackScene` are `let`, set only in `setStage(id)` (disposes previous scene), called from initLobby callback before startCountdown(). URL `?stage=<id>`; unknown -> default + console.warn. Code before race start must not read `track`.
- Physics still global state in main.js; slope formula inline using track.heightAt. Physics does not read surfaceAt yet (EP-003).
- Delivery script rewrites the task Completed timestamp to real clock.

## UX gates pending (batched per epic)
- EP-002-02: track/mud/background/driving feel identical to prototype.

## EP-002-03 (PR #7 — CI green, NOT merged yet: merge blocked by permission classifier, awaiting human)
- Adding a stage = one src/stages/<id>.stage.js (CA-003 proven). Hidden stage `teste-plano`: finishX 200, near-flat, sand [60,90) + mud [120,150), background /img/cerrado.jpg, mudLayer false. `/?stage=teste-plano` = short race; useful for surface-traction tests.
- tests/e2e/stage-data.spec.js drives /?stage=teste-plano to #end-overlay and fails on the "stage ... not found" fallback warning.
- `gh pr checks` may show governance "skipping" (duplicate skipped run) while the real run succeeded; check `gh api repos/Kaleugit/race-game/commits/<sha>/check-runs`.
- EP-002-03 merged (#7) by the user; from now on subagents may merge green PRs (see runbook).

## EP-003-01 (merged #8)
- src/physics/params.js: frozen BASE_PARAMS (all old constants); SUSP_REST/SUSP_MAX_COMPRESS/SUSP_MAX_EXTEND/CHASSIS_HITBOX live here, re-exported by src/car.js.
- src/physics/car-physics.js: createCarPhysics({track, params}) -> {state, step(dt, {up,down,left,right,space,locked}), reset()}; step returns {chassisContact, landed, righted(always false)}. Pure: no DOM/three/Math.random.
- state fields: x, speed, y, vy, rot, angVel, airborne, airTime, bounceLevel, lean, slopeRotVisual, suspY, suspVy, prevTrackH, fuel, turboActive, chassisLatched, finished, suspensionEnabled, infiniteTurbo.
- main.js: playerCar created in setStage, reset in resetGame, stepped in tick (~line 573); main keeps crashSettling/crashed/timers in its own `state`; triggerCrash sets playerCar.state.turboActive=false; finalizeCrash zeroes speed/vy/angVel/suspVy. Crash flow triggered by chassisContact.
- For EP-003-02: remove chassisLatched latch and the `locked||chassisContact` rotation lock when the crash flow goes away.
- tests/sim/harness.js: runRace({stage, params=BASE_PARAMS, driver, dt=1/60, maxTime=180, initialState}) -> {finished, finishTime, maxSpeed, crashed, samples}.
- tests/sim/car-physics.test.js: 3 golden tests (1e-9) recorded from old code; any change to default-params physics fails them. EP-003-03 must keep misto/padrao presets as identity (== BASE_PARAMS).
- Finish check in main.js reads playerCar.state.x BEFORE step (unchanged behavior).
- Equivalence tooling: scratchpad/equiv.mjs (+ legacy-main.js, golden.mjs) compares old vs new physics; reusable.
- UX gate pending: driving feel identical (EP-003-01).

## EP-003-02 (merged #9)
- No crash restart: chassis contact rests the car (lift by deepest penetration, zero downward vy, chassisFriction 15 m/s^2, rotation settles at chassisSettleRate 6/s, steering ignored). Upside down (cos(rot - atan(slopeAt(x))) < 0) AND ground contact for autoRightDelay 1.5s -> righted in place, speed 0; step returns righted:true once. Throttle/turbo ignored while overturned.
- state: removed chassisLatched; added overturned, upsideDownTime. BASE_PARAMS: + autoRightDelay, chassisFriction, chassisSettleRate.
- main.js: no crash flow; step locked = state.inputFrozen only. index.html crash overlay removed.
- harness runRace: no early stop on chassis contact; crashed = any contact; rightedTimes; samples include chassisContact, righted.
- Grip change for EP-003-03 goes in updateSpeed (accel * accelMult * grip[surfaceAt(x)]); keep misto/padrao identity so goldens pass.
- Righting leaves speed 0; constant `up` backflip driver stalls at x≈213 on mata-atlantica (steep climb) -> EP-004 bot must back up / use turbo. Front-flip driver `(s)=>({up:true,right:s.airborne})` is a deterministic flip scenario (2 rightings, finishes 27.85s).
- UX gate pending (EP-003-02): auto-right timing/look (instant pose change), roof rest, chassis slide.

## EP-003-03 (merged #10)
- src/parts/presets.js: TIRES, GEARBOXES, DEFAULT_PARTS, resolveCarParams(base, {tire, gearbox, upgrades=[]}) -> frozen params; upgrades=[{accelMult?, topSpeedMult?}]; throws on unknown ids. Misto+Padrão == BASE_PARAMS (identity).
- BASE_PARAMS: grip {dirt 1, mud 0.8, sand 0.75} (= Misto), surfaceDrag {dirt 0, mud 0.3, sand 0.35} (speed-proportional, ground only). car-physics: accel *= grip[surfaceAt(x)].
- main.js setStage: params = resolveCarParams(BASE_PARAMS, DEFAULT_PARTS) — EP-006 garage swaps DEFAULT_PARTS for the saved choice.
- tests/sim/parts.test.js (CA-008 + CDC-102 non-dominance pattern); tests/sim/fixtures/areia.stage.js (dirt [0,100) + sand [100,300)).
- Gearbox presets are multipliers baked into accel*/maxSpeed* (no simulated gears in physics).

## e2e fix (merged #11)
- Local e2e used SwiftShader (~7 FPS). playwright.config.js now passes --use-angle=d3d11 on win32 (~58 FPS). `npm test` is reliable locally again (2 passed ~44s). If e2e fails in the countdown again, check GPU/FPS first; never bump timeouts to hide it.

## EP-007-01 (merged #12)
- src/audio/engine-model.js: ENGINE_DEFAULTS, scaleGearRatios(ratios, preset), createEngineModel({ gearboxPreset, ...overrides }) -> { update(dt, { speed, throttle, airborne }) -> { rpm, gear, load, shifting, firingHz }, reset(), gearRatios }. Pure.
- rpm 800–4000; gear 1–5; load 0 while shifting (0.2s after shift), throttle*0.3 airborne, throttle on ground; firingHz = rpm/60*2 (26.7–133.3 Hz). Crank Hz = rpm/60; engine orders 0.5/1/2/4 multiply crank Hz.
- finalDrive 4.5; ratios scaled by 1/GEARBOXES[preset].topSpeedMult; unknown preset throws. Launch clutch slip launchRpm 1800. Speed sign ignored.
- Without turbo car tops out in 4th on Mata Atlântica; turbo reaches 5th.
- Usage for EP-007-02: create with createEngineModel({ gearboxPreset: 'padrao' }) (current parts = DEFAULT_PARTS.gearbox), update each frame with playerCar.state.speed / keys.up / playerCar.state.airborne, reset() on race restart.
- Vercel now builds main only (no PR previews); ignore missing Vercel checks on PRs.

## EP-007-02 (merged #13)
- src/sound.js: initEngineSound() -> { start, update, stop }; update(dt, { speed, throttle, airborne, turboActive, gearboxPreset }); start/stop reset the engine model; changing gearboxPreset rebuilds it. Tuning knobs at top (ORDERS, MASTER_LEVEL, *_TAU).
- main.js call: engineSound.update(dt, { speed: car.speed, throttle: keys.up, airborne: car.airborne, turboActive: car.turboActive, gearboxPreset: DEFAULT_PARTS.gearbox }) — EP-006 passes the saved gearbox id.
- UX gate pending (EP-007): realism of shifts + lower tone.

## Vercel / infra (2026-09-22)
- vercel.json git.deploymentEnabled=false: NO automatic deploys on any branch (manager rule: deploy manually once at the end). Unused .glb moved to 3d-objects/unused-public/ (deploy ~40MB). Never run vercel deploy commands.

## EP-004-01 (merged #16)
- src/bot/prng.js createPrng(seed); src/bot/bot-driver.js createBotDriver({ track, difficulty=0.5, seed=1, params=BASE_PARAMS }) -> { decide(carState, dt) -> {up,down,left,right,space,locked:false} }; runBotToFinish({ car, driver, track, dt=1/60, maxTime=180, startTime=0 }) -> race-clock finish time | null.
- src/bot/bot-preset.js BOT_DEFAULT_PARTS {tire:'misto', gearbox:'padrao'}; resolveBotParams(stage) = resolveCarParams(BASE_PARAMS, stage.bot?.parts ?? BOT_DEFAULT_PARTS).
- tests/sim/reference-driver.js createReferenceDriver(track) (skilled human reference). Mata: reference 17.30s; bot d=0.5 median 18.81s (18.03–20.60). teste-plano: reference 5.95s, bot ~6.6s.
- Tuning knobs: frozen TUNING at top of src/bot/bot-driver.js. Bot waits while overturned; recovers climb stalls by reversing to recharge turbo (race-bar can move backward briefly).
- EP-004-02 wiring: botCar = createCarPhysics({ track, params: resolveBotParams(stage) }); botDriver = createBotDriver({ track, difficulty: stage.bot.difficulty, seed: raceIndex }); tick: botCar.step(dt, botDriver.decide(botCar.state, dt)); if player finishes first: state.botFinishTime = runBotToFinish({ car: botCar, driver: botDriver, track, startTime: raceTime }).
- CA-009 (60–90s) needs longer stages -> EP-005.

## EP-004-02 (merged #17)
- Ghost removed. main.js: module-level botCar, botDriver, raceIndex, currentStage; rebuilt in resetGame (raceIndex++ = seed); bot steps in tick until finishX (then stops, time recorded); renderBotBar() drives #race-bar-bot + #bot-dist from state.botScroll (clamped). Player-first finish -> runBotToFinish (null -> "—"). Bot has no mesh.
- tests/e2e/bot.spec.js: /?stage=teste-plano idle player -> DERROTA + numeric bot time. npm test = 3 specs.
- UX gate pending (EP-004): bot plausible/beatable on Mata; perf with 2 physics instances.

## EP-005-01 (merged #18)
- Mata: finishX 620 -> 2600; 0–830 m opening unchanged; new hand-placed sections from 885 m; physical mud zones [930,1000) [1220,1390) [1940,1985) [2220,2300), color 0x3b2a1a. Max slope still 0.86 at x=222. bot.difficulty 0.5.
- Reference 73.70s; bot seeds 1..10 median 79.42s (ratio 1.078), all slower. Harder bot = LOWER bot/reference ratio (epic DA-003).
- tests/sim/stage-duration.test.js (CA-009) and bot.test.js (CA-004) iterate listStages(): new visible stages covered automatically.
- Physics goldens + height fixture now run on frozen tests/sim/fixtures/mata-atlantica-legacy.stage.js (never edit).
- Smoke e2e waits 150s (test timeout 210s). Local e2e may flake at countdown on a cold first run with 3 parallel workers (GPU contention); rerun before concluding anything.
- Tuning script: scratchpad/tune.mjs <stage path> [1] prints ref/up/flip/bot seeds/per-100m profile/max slope.

## EP-005-02 (merged #19)
- Cerrado: src/stages/cerrado.stage.js, order 2, finishX 2800, sand zones [270,440) [1180,1330) [2150,2280), ground 0x5a2616 (red earth = dirt traction), sand 0xd9b27a, max slope 0.71, bot.difficulty 0.6; ref 80.53s, bot median 86.23s (ratio 1.071 < Mata 1.078 = harder). listStages() = [mata-atlantica, cerrado].
- tests/sim/cerrado.test.js, tests/e2e/cerrado.spec.js (4 e2e specs now; two are 60–90s races).
- UX gate pending (EP-005): look, difficulty, performance on both stages.

## e2e workers (merged #20)
- playwright.config.js workers: 2 (4 parallel WebGL games starve the shared GPU). `npm test` = 4 specs, ~2 min, stable 3/3 runs.

## EP-006-01 (merged #21)
- src/parts/colors.js: CAR_COLORS (10 frozen {id,label,hex}), DEFAULT_COLOR 'vermelho' (0xb71f1f = original body), getCarColor(id).
- src/profile/profile.js: PROFILE_KEY 'race_profile_v1', LEGACY_BEST_KEY 'race_best_time'; createProfile(storage=localStorage, stages) -> { getGarage() -> {color,tire,gearbox}, saveGarage({color,tire,gearbox}), getUnlocked(), isUnlocked(id), getBest(stageId), recordWin(stageId, time) -> {best, isNewBest, unlockedId} }. Pass listStages() in (profile.js does not import stages/index.js).
- Schema: { version:1, garage:{color,tire,gearbox,upgrades:{}}, progress:{unlocked:[...], best:{[stageId]:s}} }. race_best_time only read (copied into best['mata-atlantica']), never written/removed.
- getGarage() can go straight into resolveCarParams(BASE_PARAMS, garage). Color via getCarColor(garage.color).hex.
- EP-006-04 replaces race_best_time reads/writes in main.js (~326-348) with profile.getBest/recordWin.

## EP-006-02 (merged #22)
- src/car.js: applyCarLook(carBuilt, { color?: id|hex, tire?: 'estrada'|'misto'|'offroad' }) -> carBuilt; makeCar(look?) optional; makeCar()/makeBesouro() objects have a `look` field. Unknown ids throw. makeCarGLB ignores looks. TIRE_LOOKS tuning object at top of car.js. vermelho+misto == original.
- EP-006-04: applyCarLook(carBuilt, { color: garage.color, tire: garage.tire }) and re-apply after the lobby factory swaps carBuilt (main.js ~532).
- CodeRabbit suspended by the user on GitHub (2026-09-21); verify its check/comment is absent on the next PRs.

## EP-006-03 (merged #23)
- src/ui/format.js formatTime(s) ('—' if not finite), formatDelta(player, bot) -> "+1.34s"/"-0.80s" (never "-0.00s").
- src/ui/garage.js showGarage({ selection:{color,tire,gearbox}, colors, tires, gearboxes, onChange(sel), onConfirm(sel) }), hideGarage().
- src/ui/stage-map.js showStageMap({ stages, isUnlocked(id), onSelect(id), onBack? }), hideStageMap(); locked stage disabled + data-locked="true".
- src/ui/result.js showResult({ won, playerTime, botTime, bestTime?, isNewBest?, onRematch, onMap, onGarage }), hideResult(); sets data-seconds on #end-player-time/#end-bot-time/#end-best-time; buttons without callback stay hidden. src/ui/dom.js helper.
- index.html ids: #garage-overlay #garage-colors #garage-color-name #garage-tires #garage-gearboxes #garage-confirm #map-overlay #map-stages #map-back #end-delta #end-actions #end-map #end-garage; #end-play-again = REVANCHE; #end-lobby-btn hidden (main.js:257 binds it); [hidden]{display:none!important}. z-index: #end-overlay 60 < #lobby 100 < garage/map 110.
- EP-006-04 TODO: remove #end-lobby-btn binding (main.js:257) then element; replace direct end-screen fills with showResult; remove the existing #end-play-again addEventListener (would double-fire); hide #lobby-ui while garage/map open; garage onChange -> applyCarLook live preview on lobby car; profile + resolveCarParams(BASE_PARAMS, garage) for player params; engineSound gearboxPreset from garage; recordWin/getBest instead of race_best_time.
- EP-006-05: #end-delta == formatDelta(+player data-seconds, +bot data-seconds), matches ^[+-]\d+\.\d{2}s$.

## EP-006-04 (merged #24)
- initLobby({ profile, stages, testStageId, onStart(stageId, carFactory) }) -> { openHome, openGarage, openMap }. Without ?stage=: JOGAR -> #garage-overlay.show ([data-color-id]/[data-tire]/[data-gearbox], #garage-confirm) -> #map-overlay.show ([data-stage-id], [data-locked], #map-back) -> #countdown-overlay -> race -> #end-overlay.show (#end-play-again / #end-map / #end-garage, #end-delta, data-seconds). With ?stage=<id>, JOGAR starts that stage directly.
- Result opens only when the PLAYER crosses finish; if the bot finishes first #hud-bot-won shows. #race-bar-stage = uppercase stage name. Garage read at every resetGame. Race loop paused while menus open.
- Headless ArrowUp+Space drive: Mata 93.0s (bot ~79s, so a keyboard-held driver LOSES on Mata), Cerrado 102.2s, teste-plano 6.6s (bot ~6.6s).
- Profile in localStorage race_profile_v1; wins on ?stage= shortcut races are recorded too.

## EP-006-05 (merged #25)
- New e2e: tests/e2e/drive.js (trackErrors, openGarageFromLobby, pickGarage, confirmGarage, startStageFromMap, waitCountdown, driveToFinish({timeout}), resultSeconds), flow.spec.js, progress.spec.js (REAL win on Mata, then reload -> cerrado unlocked), result.spec.js, garage.spec.js. npm test = 9 specs, ~5.4 min (2 workers).
- driveToFinish currently uses the 60 Hz space-toggle policy (exploit) + garage Estrada+Longa; EP-008-05 switches it to holding space.
- BUG (EP-008-05): updateTurbo blocks recharge while space is held and ignites with any fuel > 0; frame-toggling keeps turbo ~50% on at zero fuel; reference driver relies on it; human-rate tapping ~83–85s Mata / 90–92s Cerrado vs bot ~79 / ~86 -> bot likely unbeatable by humans.
- Order now: EP-008-01 & 02 (running) -> 05 -> 03 -> 04.

## EP-008-02 (merged #26)
- engine-model ENGINE_DEFAULTS.finalDrive 4.5 -> 3.3 (every gear ~1.36x longer); first upshift ~17-20 m/s; full turbo tops out in 4th; top gear ~2620 rpm at maxSpeedTurbo. Engine variants (EP-008-03) can override finalDrive/redlineRpm/etc. via createEngineModel(options).
- tests/sim/engine-model.test.js uses LEGACY = { finalDrive: 4.5 } baseline; longa/throttle has exactly 2 upshifts (tight ">= 2 upshifts" assertion).

## EP-008-01 (merged #27)
- Mata 1400 m (first 885 m unchanged), mud [930,1000) [1220,1320); ref 39.68s, bot d=0.5 median 42.77s (41.0–44.7), ratio 1.078, throttle-only 51.72s, max slope 0.86 @222.
- Cerrado 1360 m, sand [270,440) [1030,1180); ref 40.07s, bot d=0.6 median 42.82s (42.2–44.8), ratio 1.069, throttle-only 51.82s, max slope 0.66.
- CA-009 sim bounds 30–45s. Margins tight (~7–8%).
- Local e2e uses port 4173 strictPort: two worktrees running `npm test` at once collide ("port already used") — wait and rerun.

## EP-008-05 (merged #28)
- updateTurbo: recharge whenever turboActive is false (space held or not); when tank empties while on, state.turboLockout blocks re-ignite until fuel >= BASE_PARAMS.turboReigniteFuel (0.25). Frame toggling is slower than holding.
- reference-driver holds space; tests/e2e/drive.js driveToFinish holds ArrowUp+Space.
- Bot TUNING errorRate {easy 1.2, hard 0.4}, liftDuration [0.4, 0.9]; Cerrado bot.difficulty 0.9 (Mata 0.5). Difficulty has a weak/noisy effect; retune via TUNING lifts.
- Numbers: Mata ref 43.02s, bot median 46.25s (44.65–51.3), ratio 1.075; Cerrado ref 42.93s, bot median 45.45s (44.00–48.9), ratio 1.059. Human-rate 0.1s taps beat bot median by 6.3% / 4.4%. bot.test.js has a human-rate margin >= 3% check (Cerrado tight at 4.4%).
- EP-008-03 tanks: fuel stays 0..1 normalized; tank capacity should scale TURBO_DEPLETE/TURBO_RECHARGE (and keep turboReigniteFuel as fraction); re-check CA-004 human-rate margin if default turbo changes. Default ("medio") must keep physics identical.
- Measurement tool: scratchpad/tune5.mjs <stage> [difficulty].

## EP-008-03 (merged #29)
- presets.js: ENGINES e16/e20/e24 (labels 1.6/2.0/2.4, each has .sound + .timbre), CHASSIS leve/medio/pesado, TANKS pequeno/medio/grande (PT-BR labels). DEFAULT_PARTS = { tire:'misto', gearbox:'padrao', engine:'e20', chassis:'medio', tank:'medio' }. resolveCarParams(base, {tire,gearbox,engine,chassis,tank}) — missing parts = defaults; unknown ids THROW (profile must sanitize).
- BASE_PARAMS.mass (divides accel/air torque/landing rebound) and BASE_PARAMS.turboCapacity (divides burn/recharge; fuel stays 0..1). Resolved params carry turboCapacity -> turbo HUD can show tank size from it.
- Sound: sound.update(dt, { ..., engine }) rebuilds the engine model on change; createEngineModel({ engine }). main.js does NOT pass engine yet (EP-008-04).
- Profile/garage/main.js untouched: profile stores only color/tire/gearbox; tests/sim/profile.test.js DEFAULT_GARAGE pinned to color/tire/gearbox — EP-008-04 extends it (contract extension, not loosening).
- Turbo per tank (hold): default 3.02 s, Pequeno 2.12 s, Grande 4.22 s. Mata Up+Space: default 43.02 s, 2.4 41.70, Leve 42.25.

## EP-008-04 (PR #30)
- Garage has 5 part rows (PNEU, MOTOR, CÂMBIO, CHASSI, TANQUE DE TURBO); selectors [data-engine]/[data-chassis]/[data-tank] in #garage-engines/#garage-chassis/#garage-tanks; tradeoff labels computed in src/ui/garage.js (engine ACEL = accelMult/mass, net).
- profile.getGarage() returns { color, tire, gearbox, engine, chassis, tank }; unknown/missing ids -> DEFAULT_PARTS (Object.hasOwn); race_profile_v1 stays version 1, old profiles not rewritten on load.
- main.js: playerParams resolved each resetGame; engineSound.update gets engine; #turbobar cells = round(12 x turboCapacity) (8/12/17); #hud dataset engine/turboCapacity/mass for e2e.
- Garage CSS tiers: >860px tall 1 column; <=860px 2 columns; <=500px compact (per-button labels hidden). Fit e2e at 640x360 and 740x360.
- npm test = 12 specs (~3.3 min). UX to check: panel covers part of lobby car at 1280x720 (all of it on phones), turbo bar per tank, engine sound variants.
