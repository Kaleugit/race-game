# 2026-09-21 — TASK-kaleugit-EP-007-02

- `initEngineSound()` -> `{ start, update(dt, { speed, throttle, airborne, turboActive, gearboxPreset }), stop }`; update is a no-op until start(); start()/stop() reset the engine model; changing gearboxPreset rebuilds it.
- Tuning knobs live at the top of src/sound.js (ORDERS table, MASTER_LEVEL, *_TAU); RPM/gear behavior lives in src/audio/engine-model.js.
