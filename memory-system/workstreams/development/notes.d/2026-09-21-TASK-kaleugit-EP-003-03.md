# 2026-09-21 — TASK-kaleugit-EP-003-03

- `import { TIRES, GEARBOXES, DEFAULT_PARTS, resolveCarParams } from './parts/presets.js'`; `resolveCarParams(BASE_PARAMS, { tire, gearbox, upgrades = [] })` -> frozen params; upgrades are `{ accelMult?, topSpeedMult? }` (EP-006 garage swaps the argument in src/main.js setStage).
- BASE_PARAMS gains `grip = { dirt: 1, mud: 0.8, sand: 0.75 }` (= Misto) and `surfaceDrag = { dirt: 0, mud: 0.3, sand: 0.35 }` (1/s, proportional to speed, ground only).
- Default car on teste-plano is now slowed in its sand/mud zones; mata-atlantica (all dirt) is unchanged.
- Sim fixture tests/sim/fixtures/areia.stage.js: dirt [0,100) + sand [100,300), finishX 300 (exports SAND_FROM/SAND_TO). EP-005-02 re-checks CA-008 on the real Cerrado.
