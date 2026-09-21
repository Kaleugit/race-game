# API Index — Kaleugit/race-game

> **Coverage**: 6/10 backend files (60%), 0/0 frontend custom elements (0%).
> Auto-generated from JSDoc `@module` / `@summary` / `@element` tags. Transition phase — files without these tags do NOT appear here.
>
> **If you don't find what you need:**
> 1. `grep -rn "<concept>" src/ public/` to confirm absence vs. undocumented.
> 2. If grep surfaces a candidate -> consume it (DRY).
> 3. **Add the missing JSDoc tags to the file you touched** before closing the task. Boy-scout rule — your PR expands this index.

Last regenerated: 2026-09-21T22:33Z
Total candidate files scanned: 10

## Backend modules

### `src/main.js` — main
- Game entry point: renderer, car, input, physics loop, HUD; stage selected via ?stage=<id>.

### `src/stages/index.js` — stages/index
- Stage discovery: every src/stages/*.stage.js file becomes a stage (Vite import.meta.glob).

### `src/stages/mata-atlantica.stage.js` — stages/mata-atlantica
- Mata Atlântica stage data, migrated verbatim from the pre-migration src/main.js

### `src/stages/registry.js` — stages/registry
- Pure stage registry and stage-contract validation. No three.js, no DOM.

### `src/track/track-scene.js` — track/track-scene
- Three.js scene objects for a stage (road, mud layer, ground, sky background,
- Builds all stage-dependent scene objects and returns their per-frame updater.

### `src/track/track.js` — track/track
- Pure track query built from stage data (height, slope, surface). No three.js, no DOM.

## Frontend custom elements

_No tagged custom elements yet. Add `@element <tag-name>` to a class JSDoc block that calls `customElements.define` to populate this section._
