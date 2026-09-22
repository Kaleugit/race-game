# 2026-09-21 — TASK-kaleugit-EP-007-02

- EP-007 Task 02 (Standard): src/sound.js rewritten as an engine-order synth (orders 0.5/1/2/4 of crank Hz, load-driven gains and lowpass, combustion noise AM at firingHz, turbo hiss/whine + blow-off) on createEngineModel; GEARS/virtualSf/shiftDip/overdrive removed; main.js passes { speed, throttle, airborne, turboActive, gearboxPreset }. `npm test` 2/2, `npm run test:sim` 43/43. UX gate pending human.
