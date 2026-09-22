# 2026-09-21 — TASK-kaleugit-EP-007-01

- `import { createEngineModel, ENGINE_DEFAULTS, scaleGearRatios } from './audio/engine-model.js'`; `createEngineModel({ gearboxPreset })` -> `{ update(dt, { speed, throttle, airborne }) -> { rpm, gear, load, shifting, firingHz }, reset(), gearRatios }`.
- `throttle` 0..1 (booleans accepted); `speed` sign ignored; load 0 while shifting, throttle*0.3 airborne. Call `reset()` on race restart.
- Gearbox preset id = the EP-003 GEARBOXES key (`curta`/`padrao`/`longa`); unknown id throws.
