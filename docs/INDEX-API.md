# API Index — Kaleugit/race-game

> **Coverage**: 19/21 backend files (90%), 0/0 frontend custom elements (0%).
> Auto-generated from JSDoc `@module` / `@summary` / `@element` tags. Transition phase — files without these tags do NOT appear here.
>
> **If you don't find what you need:**
> 1. `grep -rn "<concept>" src/ public/` to confirm absence vs. undocumented.
> 2. If grep surfaces a candidate -> consume it (DRY).
> 3. **Add the missing JSDoc tags to the file you touched** before closing the task. Boy-scout rule — your PR expands this index.

Last regenerated: 2026-09-22T01:54Z
Total candidate files scanned: 21

## Backend modules

### `src/audio/engine-model.js` — audio/engine-model
- Pure engine model for the engine sound (EP-007): RPM from car speed through a 5-speed
- Default engine/gearbox configuration.
- Scale gear ratios by the EP-003 gearbox preset (`curta`, `padrao`, `longa`).
- Build a pure engine model: `{ update(dt, input), reset(), gearRatios }`.

### `src/bot/bot-driver.js` — bot/bot-driver
- Bot AI (RF-004): turns the bot car's state into the same input the player produces
- Bot controller: `createBotDriver({ track, difficulty, seed })` -> `{ decide(carState, dt) }`.
- Next input for the bot car: `{ up, down, left, right, space, locked: false }`.
- Simulate the bot to the finish line; returns its finish time (s) or null past `maxTime`.

### `src/bot/bot-preset.js` — bot/bot-preset
- The bot's own part preset (RF-007: the bot never inherits the player's garage choice).
- Bot car params for a stage: `resolveCarParams(BASE_PARAMS, stage.bot.parts ?? BOT_DEFAULT_PARTS)`.

### `src/bot/prng.js` — bot/prng
- Seeded pseudo-random generator (mulberry32) for the bot's errors (CDC-106: no
- Seeded PRNG: `createPrng(seed)` -> `() => number` in [0, 1).

### `src/car.js` — car
- Bandeirante car meshes (procedural and GLB), smoke, springs, hitbox debug.

### `src/main.js` — main
- Game entry point: renderer, car visuals, input, race loop, HUD; stage selected via ?stage=<id>.

### `src/parts/colors.js` — parts/colors
- The 10 fixed garage body colors (RF-007, visual only) and the default color id.
- Frozen list of the 10 garage colors.
- Color entry by id, or undefined for an unknown id.

### `src/parts/presets.js` — parts/presets
- Tire and gearbox presets (RF-008, RF-009) and resolveCarParams, which turns a part
- Tire presets keyed by id (`estrada`, `misto`, `offroad`).
- Gearbox presets keyed by id (`curta`, `padrao`, `longa`).
- Build frozen car params from `base` and `{ tire, gearbox, upgrades = [] }`.

### `src/physics/car-physics.js` — physics/car-physics
- Per-instance car physics (turbo, speed, vertical/bounce, chassis contact, rotation,
- Build a car physics instance: `{ state, step(dt, input), reset() }`.

### `src/physics/params.js` — physics/params
- Car physics constants (BASE_PARAMS), moved verbatim from the pre-extraction
- Default car parameters: the prototype's driving feel. Frozen; derive copies to tune.

### `src/profile/profile.js` — profile/profile
- Local player profile (RF-003, RF-007): garage choice and stage progress persisted under
- Build the profile API `{ getGarage, saveGarage, getUnlocked, isUnlocked, getBest, recordWin }`.

### `src/sound.js` — sound
- Web Audio engine sound synthesized from engine orders (EP-007).
- Build the engine sound: `{ start, update, stop }`.

### `src/stages/cerrado.stage.js` — stages/cerrado
- Cerrado stage data (EP-005-02): open savanna on red earth — long fast flats, two

### `src/stages/index.js` — stages/index
- Stage discovery: every src/stages/*.stage.js file becomes a stage (Vite import.meta.glob).

### `src/stages/mata-atlantica.stage.js` — stages/mata-atlantica
- Mata Atlântica stage data (EP-005-01): the prototype opening (0–830 m, verbatim from the

### `src/stages/registry.js` — stages/registry
- Pure stage registry and stage-contract validation. No three.js, no DOM.

### `src/stages/teste-plano.stage.js` — stages/teste-plano
- Hidden near-flat test stage (CA-003 proof): data only, one sand and one mud zone.

### `src/track/track-scene.js` — track/track-scene
- Three.js scene objects for a stage (road, mud layer, ground, sky background,
- Builds all stage-dependent scene objects and returns their per-frame updater.

### `src/track/track.js` — track/track
- Pure track query built from stage data (height, slope, surface). No three.js, no DOM.

## Frontend custom elements

_No tagged custom elements yet. Add `@element <tag-name>` to a class JSDoc block that calls `customElements.define` to populate this section._
