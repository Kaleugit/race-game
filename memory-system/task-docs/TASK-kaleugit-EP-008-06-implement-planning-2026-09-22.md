# Planning - TASK-kaleugit-EP-008-06 (garage parts panel redesign)

- Date: 2026-09-22 12:15
- Execution Mode: Standard
- Mandatory Escalation Conditions: none triggered (mobile landscape has room without overlapping the car: measured, see report)

## Audit (design-taste-frontend / redesign-existing-projects, audit-first)
- Design read: in-game loadout screen for a mobile-first arcade racer, dark low-poly garage, gold single accent, Courier New mono across the game; dials VARIANCE 4 / MOTION 3 / DENSITY 6 (game UI, not a landing page).
- Retire: one modal-like panel over the car and TELA CHEIA; 15 bordered boxes with dot-separated wrapping text ("· PESO −10%" orphans, "OFF-\nROAD"); 32px swatches; outline-only CONFIRMAR with the same weight as the options.
- Keep: Courier New, gold #ffd86b accent, square corners, PT-BR labels, dark translucent surfaces, all data-* / id contracts.

## Measurements (before; lobby camera is orthographic with a fixed VIEW_H)
- Car (opaque canvas pixels) 1280x720: x 424-857; 640x360: x 213-426; 740x360: x 250-490 (that run had the car spun by the mouse-move bug below).
- TELA CHEIA wrap: top-right, bottom at y=91; mute button bottom-left.
- Free side width = 50vw - ~30vh (side view), up to ~33.5vh when the player drag-rotates the car.

## Plan
1. Two docks: left top (MOTOR, CÂMBIO, PNEU, DESEMPENHO summary), right bottom below TELA CHEIA (CHASSI, TANQUE DE TURBO, COR, CONFIRMAR). Width min(420px, 50vw - 34vh - 2 gutters).
2. Segmented control per part; selected = gold tint + inset border + bottom bar; hover = dashed outline (preview, not selection).
3. Stat bars per row (deltas diverge from a centre tick, grip fills from the left); hover/focus previews an option; whole-car summary with the resolveCarParams products; mobile: key + value 2-column text.
4. Lobby: rotate only on a press started on the canvas; no zoom while garage/map are open.
5. New e2e garage-layout.spec.js (4 viewports: no dock intersects TELA CHEIA nor the car's pixel box, no scroll, CONFIRMAR in viewport). Existing specs unchanged.
