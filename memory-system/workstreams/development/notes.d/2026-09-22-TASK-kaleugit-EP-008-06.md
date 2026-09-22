# 2026-09-22 — TASK-kaleugit-EP-008-06

- Garage DOM: `#garage-panel` (left dock: #garage-engines, #garage-gearboxes, #garage-tires, #garage-summary) and `#garage-side` (right dock: #garage-chassis, #garage-tanks, #garage-colors, #garage-confirm). All data-* selectors unchanged; `.opt-trade` is screen-reader text; `.garage-sel-trade` (+ `.garage-stats`) holds `.stat[data-tone]` rows and is visible at every size.
- Dock width = min(420px, 50vw - 34vh - 2 gutters): the lobby car is ~60vh long side-on (VIEW_H fixed), <= ~67vh when drag-rotated. Changing the lobby camera/VIEW_H or car size means re-checking tests/e2e/garage-layout.spec.js.
- garage.js exports partStats(kind, item) and buildStats(parts) (mirrors resolveCarParams products); keep in sync if resolveCarParams changes.
- lobby.js: rotation only while a canvas press is held; enterZoom skipped while #lobby-ui is hidden (garage/map open).
