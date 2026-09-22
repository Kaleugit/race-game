# Planning - TASK-kaleugit-EP-008-11 (bot fantasma opcional)

- Date: 2026-09-22 19:30
- Execution Mode: Standard
- Mandatory Escalation Conditions: none triggered (decorative render + one persisted boolean; no physics, no bot simulation and no race-time change)

## Context
- Manager UX request (2026-09-22): "I also want the possibility of having the bot as a ghost." Today `botCar` is a full physics
  instance stepped every frame in main.js but it has no mesh: only its x feeds `#race-bar-bot` and the 1º/2º badges (EP-008-10).
- Camera convention (track-scene.js): the player is always drawn at world x = 0 and the track scrolls by `playerCar.state.x`,
  so an opponent at world x `botX` belongs at screen-space x = `botX - playerX`.
- Profile (EP-006-01/EP-008-04): `race_profile_v1`, version 1, loaded non-destructively — missing fields load defaults and
  reading never rewrites the stored JSON.

## Plan
1. `src/bot/ghost-car.js` (new): `createGhostCar({ scene, look })` builds one `makeCar()` and turns every material translucent +
   cold-tinted (`GHOST_TUNING`), drops the headlight (no second point light), the debug hitbox and the exhaust smoke.
   `update(botState, playerX, dt, halfWidth)` places it at `botX - playerX` and culls it off-screen; `setEnabled(on)` shows/hides.
2. `src/profile/profile.js`: `settings: { ghostBot }` beside garage/progress, `DEFAULT_SETTINGS` (off), `getSettings` /
   `saveSettings`; invalid or missing values fall back to the default, no migration.
3. `index.html` + `src/ui/stage-map.js` + `src/lobby.js`: `#map-ghost` ("BOT FANTASMA — LIGADO/DESLIGADO", `data-ghost`,
   `aria-pressed`) on the map screen, styled with the shared `:root` tokens; each flip is saved in the profile immediately.
4. `src/main.js`: build the ghost lazily on the first race that has the option on (never while it is off), `setEnabled` per race
   in `resetGame`, `update` once per frame right after the player's visuals; `#hud[data-ghost]` exposes the state to the e2e.
5. Tests: profile settings in `tests/sim/profile.test.js`; `tests/e2e/ghost-bot.spec.js` (real pixels: ghost on vs off, plus
   persistence across a reload) and `tests/e2e/map-layout.spec.js` (toggle never overlaps, 4 viewports, both states).

## Risks / mitigations
- Physics drift: the ghost only reads `botCar.state` — goldens and CA-004/CA-009 numbers untouched (`npm run test:sim`).
- Frame rate: nothing is built while the option is off; off-screen the pivot is hidden and no per-frame math runs.
- Pixel-sampling e2e of EP-008-12 (hazard signs, PR #36): it runs with a fresh profile, i.e. ghost off, so no ghost pixels
  can reach its clip.
