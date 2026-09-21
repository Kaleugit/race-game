# 2026-09-21 — TASK-kaleugit-EP-003-01

- Physics API: `createCarPhysics({ track, params })` -> `{ state, step(dt, { up, down, left, right, space, locked }), reset() }`; `step` returns `{ chassisContact, landed, righted }` (`righted` always false until Task 02). State: x, speed, y, vy, rot, angVel, airborne, airTime, bounceLevel, lean, slopeRotVisual, suspY, suspVy, prevTrackH, fuel, turboActive, chassisLatched, finished, suspensionEnabled, infiniteTurbo.
- `tests/sim/car-physics.test.js` has golden checkpoints from the pre-extraction physics: any intended physics change (Task 02 crash removal, Task 03 grip) must keep them passing for default params or consciously re-record them.
- `tests/sim/harness.js` `runRace({ stage, params, driver, dt, maxTime, initialState })` stops on finish or first chassis contact (`crashed: true`).
