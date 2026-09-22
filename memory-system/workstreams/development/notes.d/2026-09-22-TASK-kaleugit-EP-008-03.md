# 2026-09-22 — TASK-kaleugit-EP-008-03

- BASE_PARAMS.mass divides throttle/turbo accel, AIR_TORQUE and the landing rebound; BASE_PARAMS.turboCapacity divides TURBO_DEPLETE/TURBO_RECHARGE (fuel stays 0..1). Engines also scale TURBO_DEPLETE (turboBurnMult).
- resolveCarParams(base, { tire, gearbox, engine?, chassis?, tank? }): missing new parts = DEFAULT_PARTS, so profile.getGarage() (still color/tire/gearbox) keeps working until EP-008-04.
- EP-008-04 wiring: engineSound.update(dt, { ..., engine: garage.engine }); turbo HUD can show seconds = params.turboCapacity / params.TURBO_DEPLETE; labels in ENGINES/CHASSIS/TANKS[id].label.
