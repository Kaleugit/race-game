# Report - TASK-kaleugit-EP-008-07 (race HUD standardization + gauges)

- Date: 2026-09-22 13:30
- Branch: TASK-kaleugit-EP-008-07-implement
- Status: COMPLETED (PR open, UX gate pending human)

## What changed
- index.html: shared UI tokens on :root (the garage now reads them, same values); race UI rules (`.race-ui` = UI font + `--ui-fs`): `#hud` with `#speed-gauge` / `#turbo-gauge` SVGs and a DIST / BOT readout strip (gold top border like the garage docks), `#hud-bot-won` styled, `#race-actions` column (LOBBY / REINICIAR / TOUCH as `.race-btn`), race bar placed between the HUD and the actions column with diamond markers and the stage name, touch pads square with FREIO / TURBO / ACEL labels, keyboard hint hidden while touch is on, countdown sized in em.
- src/ui/race-hud.js (new): `createRaceHud()` -> `{ configure({ turboCapacity, maxSpeedTurbo }), update(carState), setBotDist(m) }`; exports `turboSegments(capacity)` and `speedGaugeMax(maxSpeedTurbo)`. Speed gauge: 240° arc, scale = turbo top speed rounded up to 50 km/h (400 for the default car), needle + digital km/h (arc turns orange while turbo burns). Turbo gauge: round(12 x capacity) segments of 15° (Pequeno 8, Médio 12, Grande 17), fuel %, red "RECARGA" + 25% tick during lockout.
- src/main.js: uses race-hud (old text bar removed), configure per race in resetGame, inline styles of #hud-bot-won / #race-bar-stage moved to CSS, in-race buttons blur after click.
- tests/e2e/hud-layout.spec.js (new), tests/e2e/parts.spec.js (Grande = 17 drawn turbo segments instead of 17 text cells).

## Screenshots (mid-race, Mata Atlântica)
- Before: memory-system/task-docs/TASK-kaleugit-EP-008-07-before-{1280x720,1920x1080,640x360-touch,740x360-touch}.png
- After: memory-system/task-docs/TASK-kaleugit-EP-008-07-after-{1280x720,1920x1080,640x360-touch,740x360-touch}.png

## Validation
- `npm run test:sim` 104/104; `npm test` 20/20 (16 existing + 4 new); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it.
- UX gate: pending human (batched at epic end).
