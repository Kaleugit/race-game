# API Index — Kaleugit/race-game

> **Coverage**: 11/14 backend files (79%), 0/0 frontend custom elements (0%).
> Auto-generated from JSDoc `@module` / `@summary` / `@element` tags. Transition phase — files without these tags do NOT appear here.
>
> **If you don't find what you need:**
> 1. `grep -rn "<concept>" src/ public/` to confirm absence vs. undocumented.
> 2. If grep surfaces a candidate -> consume it (DRY).
> 3. **Add the missing JSDoc tags to the file you touched** before closing the task. Boy-scout rule — your PR expands this index.

Last regenerated: 2026-09-21T23:54Z
Total candidate files scanned: 14

## Backend modules

### `src/car.js` — car
- Bandeirante car meshes (procedural and GLB), smoke, springs, hitbox debug.

### `src/main.js` — main
- Game entry point: renderer, car visuals, input, race loop, HUD; stage selected via ?stage=<id>.

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

### `src/stages/index.js` — stages/index
- Stage discovery: every src/stages/*.stage.js file becomes a stage (Vite import.meta.glob).

### `src/stages/mata-atlantica.stage.js` — stages/mata-atlantica
- Mata Atlântica stage data, migrated verbatim from the pre-migration src/main.js

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
