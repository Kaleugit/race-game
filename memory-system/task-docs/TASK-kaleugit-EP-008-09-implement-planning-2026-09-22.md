# Planning - TASK-kaleugit-EP-008-09 (lobby CORRIDA/GARAGEM + garage carousel)

- Date: 2026-09-22 13:55
- Execution Mode: Standard
- Mandatory Escalation Conditions: none triggered (the carousel fits mobile landscape: 640x360 and 740x360 proven by e2e on every slide)

## Audit (design-taste-frontend)
- Design read: garage menu of a side-scrolling arcade racer, desktop and phone landscape, same language as EP-008-06/07 (Courier New, single gold accent, square corners, dark translucent panels via :root tokens). Dials VARIANCE 4 / MOTION 3 / DENSITY 4.
- Before: lobby = title + JOGAR (JOGAR -> garage -> map); garage = two docks (MOTOR/CAMBIO/PNEU/DESEMPENHO left, CHASSI/TANQUE/COR/CONFIRMAR right) all on screen at once: the manager finds it cluttered.
- Keep: #garage-overlay, option containers (#garage-engines/-gearboxes/-tires/-chassis/-tanks/-colors) and data-* selectors, aria-pressed, #garage-color-name, #garage-summary, #garage-confirm, profile persistence, live recolor, the car-pixel non-overlap proof.

## Plan
1. index.html: lobby #lobby-actions with CORRIDA (#lobby-play, gold primary) + GARAGEM (#lobby-garage); garage = one #garage-card top-left (width 50vw - 34vh - gutters, like the old left dock) with header (GARAGEM + n/6), arrows + part name, 6 pips, one grid cell of 6 slides, compact DESEMPENHO, PRONTO.
2. src/ui/garage.js: carousel (arrows, pips, keyboard, swipe, wrap, entry animation honoring reduced motion); exports GARAGE_SLIDES.
3. src/lobby.js: CORRIDA -> map (or ?stage= direct start); GARAGEM -> garage; PRONTO saves -> lobby; map back -> lobby.
4. tests: drive.js helpers navigate the carousel (goToGarageSlide via the real arrow), confirmGarage lands on the lobby, openMapFromLobby; garage-layout.spec checks every slide; parts.spec mobile fit checks every slide; new lobby.spec.js.
