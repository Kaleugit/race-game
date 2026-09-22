# Planning - TASK-kaleugit-EP-008-07 (race HUD standardization + gauges)

- Date: 2026-09-22 12:25
- Execution Mode: Standard
- Mandatory Escalation Conditions: none triggered (mobile landscape fits: 640x360 and 740x360 proven by e2e)

## Audit (design-taste-frontend / redesign-existing-projects)
- Design read: in-race HUD for a side-scrolling arcade racer played on desktop and phone landscape; same language as the EP-008-06 garage (Courier New, gold single accent, square corners, dark translucent surfaces); dials VARIANCE 3 / MOTION 2 / DENSITY 6 (game HUD).
- Before: #hud 14px plain text with a block-character turbo bar; race bar labels 10px; buttons 13px at fixed px offsets; touch buttons round with glyph labels; keyboard hint overlapping the left touch pad at 640x360; countdown 22/96px. Four unrelated sizes, no shared tokens.
- Keep: all ids tests use (#hud data-*, #speed, #dist, #bot-dist, #hud-bot-won, #race-bar-*, #btn-*, #mobiletoggle, #touchpad [data-key], #gasturbo), PT-BR labels.

## Plan
1. :root tokens shared by garage and race UI; garage switched to the tokens (same values).
2. src/ui/race-hud.js: SVG speed gauge (240° arc fill via stroke-dashoffset, needle via transform, digital km/h #speed) and turbo gauge (capacity-sized segmented arc, % readout, lockout state); updates only on value change.
3. index.html: #hud gauges + DIST/BOT readout strip; #race-actions column; race bar between the columns; touch pad restyle; countdown in em.
4. tests/e2e/hud-layout.spec.js (4 viewports, touch on); parts.spec.js turbo check moved to the gauge segments (still 17 for Grande).
