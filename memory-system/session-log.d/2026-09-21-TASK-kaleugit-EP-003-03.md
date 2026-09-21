# 2026-09-21 — TASK-kaleugit-EP-003-03

- EP-003 Task 03 (Standard): tire (Estrada/Misto/Off-road) and gearbox (Curta/Padrão/Longa) presets in src/parts/presets.js with resolveCarParams; physics applies grip[surfaceAt(x)] to acceleration and speed-proportional surfaceDrag on the ground. Misto/Padrão = identity over BASE_PARAMS (goldens unchanged). CA-008 and CDC-102 proven in tests/sim/parts.test.js. `npm run test:sim` 37/37. UX gate pending human.
