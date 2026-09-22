# Report - TASK-kaleugit-EP-008-10 (HUD: player distance only + 1º/2º; 1 s countdown)

- Date: 2026-09-22 14:15
- Branch: TASK-kaleugit-EP-008-10-implement
- Status: COMPLETED (PR open, UX gate pending human)

## What changed
- index.html: BOT distance row (`#bot-dist`) removed; the readout strip now holds only DIST (shrinks to its content). Race bar labels carry position badges `#race-pos-you` / `#race-pos-bot` (`.race-pos`, "1º"/"2º"): `[1º] VOCÊ ──◆── BOT [2º]`; the leader's badge (`data-leader="true"`) is filled gold (--ui-gold), the other is a muted glass badge. Countdown initial text "1".
- src/ui/race-hud.js: new pure `playerLeads(prevPlayerFirst, playerX, botX, finishX)` (further x leads; tie keeps previous order; first to cross finishX is locked 1º); HUD API `setBotDist` replaced by `setPositions(playerFirst)` (DOM touched only when the order flips).
- src/main.js: order computed per frame in updateHUD from player x and botScroll (reset to grid order VOCÊ 1º each race); countdown = 1 s total ("1" for 0.6 s, "VAI!" for 0.4 s, then control) via COUNTDOWN_S / COUNTDOWN_GO_AT_S.
- tests: tests/sim/race-position.test.js (new, 5 cases); tests/e2e/race-position.spec.js (new: countdown shows exactly "1" -> "VAI!" and lasts 0.9–1.8 s wall clock; #bot-dist gone; per-frame check that badges agree with the race-bar markers; bot passes an idle player -> BOT 1º, player with infinite turbo retakes the lead -> VOCÊ 1º); tests/e2e/hud-layout.spec.js race-bar group now also unions the two badges (same pairwise non-overlap, stricter).

## Screenshots (Mata Atlântica, touch on)
- memory-system/task-docs/TASK-kaleugit-EP-008-10-after-{1280x720,740x360}.png (player 1º)
- memory-system/task-docs/TASK-kaleugit-EP-008-10-after-bot-leads-{1280x720,740x360}.png (bot 1º)
- memory-system/task-docs/TASK-kaleugit-EP-008-10-countdown-{1280x720,740x360}.png

## Validation
- `npm run test:sim` 109/109; `npm test` 21/21 (20 existing + 1 new); `./scripts/validate-changed.sh` PASS; validate-all N/A locally (TD-001/TD-002), CI runs it.
- UX gate: pending human (batched at epic end).
