# 2026-09-22 — TASK-kaleugit-EP-008-09

- Lobby: `#lobby-play` = CORRIDA (map; `?stage=<id>` starts that stage directly), `#lobby-garage` = GARAGEM. Garage PRONTO (`#garage-confirm`) saves and returns to the lobby (from the result screen too); `#map-back` returns to the lobby.
- Garage = one `#garage-card` carousel; `GARAGE_SLIDES` (src/ui/garage.js) = engine, gearbox, tire, chassis, tank, color; current slide in `#garage-card[data-slide]`, `#garage-cat`, `#garage-step` "n/6", `#garage-pips [aria-current="step"]`. Only the active slide is visible/clickable.
- e2e: use drive.js `openGarageFromLobby`, `goToGarageSlide`, `pickGarage` (navigates), `confirmGarage` (asserts lobby), `openMapFromLobby`, `startStageFromMap`. Adding a garage part = new slide in index.html + GARAGE_SLIDES + drive.js GARAGE_FIELDS.
