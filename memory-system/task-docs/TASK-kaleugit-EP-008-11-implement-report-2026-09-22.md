# Report - TASK-kaleugit-EP-008-11 (bot fantasma opcional)

- Date: 2026-09-22 20:20
- Branch: TASK-kaleugit-EP-008-11-implement
- Status: COMPLETED (PR open, UX gate pending human)

## What changed
- `src/bot/ghost-car.js` (new): `createGhostCar({ scene, look })` -> `{ setEnabled, update, dispose }` plus the frozen
  `GHOST_TUNING` knobs. It builds one `makeCar(look)` and turns every material translucent (`opacity 0.62`, `depthWrite false`)
  and cold-tinted (colors blended 60% towards `0x6fdcff`, cold emissive), so it is the same Bandeirante model but unmistakably a
  ghost. The headlight is removed from the group (no second point light in the scene), the debug hitbox and the exhaust smoke
  sprites are disabled. `update(botState, playerX, dt, halfWidth)` places the pivot at `botX - playerX` (the camera keeps the
  player at world x = 0 and the track scrolls by `playerX`), mirrors the bot rotation, suspension, wheel spin and turbo flame,
  and culls the ghost (hides the pivot, computes nothing else) as soon as it is more than `halfWidth + 3 m` from the camera.
  It only reads `botCar.state`: no collision, no physics, no effect on the bot simulation.
- `src/profile/profile.js`: new `settings` block beside `garage`/`progress` with `DEFAULT_SETTINGS = { ghostBot: false }`, plus
  `getSettings()` / `saveSettings(partial)`. `race_profile_v1` stays version 1, absent or invalid values load the default and
  loading alone never rewrites the stored JSON (same non-destructive rule as the EP-008-04 parts).
- `index.html` + `src/ui/stage-map.js` + `src/lobby.js`: `#map-ghost` on the map screen — "BOT FANTASMA … LIGADO/DESLIGADO"
  (`#map-ghost-value`, `data-ghost="on|off"`, `aria-pressed`) — styled with the shared `:root` tokens (`--ui-font`, `--ui-face`,
  `--ui-line`, `--ui-gold`, `--ui-muted`): dashed muted card while off, solid gold while on, with compact rules in the
  `max-height: 500px` mobile-landscape tier. Every flip is saved in the profile right away, so it survives a reload.
- `src/main.js`: `setUpGhost()` (called from `resetGame`) builds the ghost lazily on the first race that has the option on —
  nothing is built while it is off — then only enables/disables it per race, and publishes the state as `#hud[data-ghost]`.
  One `ghostCar?.update(...)` per frame right after the player's visuals.

## Screenshots
- memory-system/task-docs/TASK-kaleugit-EP-008-11-ghost-t0.9-{1280x720,740x360}.png (ghost on, Mata Atlântica, mid-race)
- memory-system/task-docs/TASK-kaleugit-EP-008-11-ghost-t1.2-{1280x720,740x360}.png (ghost on, further into the race)
- memory-system/task-docs/TASK-kaleugit-EP-008-11-map-toggle-{1280x720,740x360}.png (map screen with the toggle on)

Iterated on the look: the first pass (opacity 0.40, 82% tint) washed out into the Mata Atlântica mist and read as a rendering
glitch; opacity 0.62 with a 60% tint keeps the car's own shading, so the silhouette, windows, tires and roof rack stay legible
and the ghost reads as a ghost on both the misty jungle and the ochre cerrado backgrounds.

## Validation
- `npm run test:sim` 126/126 (123 existing + 3 new profile-settings cases; physics goldens untouched).
- `npm test` 31/31 after merging `origin/main` (EP-008-12 hazard signs + EP-008-14 `E2E_PORT`): 25 existing + `ghost-bot.spec.js` 2 + `map-layout.spec.js` 4. The hazard-sign pixel spec passes unchanged (it races with a fresh profile, i.e. ghost off).
- One flake seen on the first post-merge run (`race-position.spec.js` counted exactly 30 rAF frames against a `> 30` bound, GPU contention with the 1.5 min hazard-sign spec); it passes alone and in a clean full rerun. No test was modified.
- `./scripts/validate-changed.sh` PASS; `validate-all` N/A locally (TD-001/TD-002), CI runs it.
- UX gate: pending human (batched at epic end).

## Notes for later tasks
- The e2e pixel signature of the ghost (cold blue: `b > 70 && b-r > 40 && g-r > 22 && b >= g`) is sampled in the road band
  `{x:0,y:400,w:1280,h:260}` of `teste-plano`; recalibrate it if the camera, `VIEW_H`, `GHOST_TUNING` or that stage's
  background change. Measured 2026-09-22: on = 2600–10100 px/frame for ~3 s, off = exactly 0.
- The hazard-sign e2e of EP-008-12 samples pixels with a fresh profile, i.e. with the ghost off, so it is unaffected.
