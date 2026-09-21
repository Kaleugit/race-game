# 2026-09-21 — TASK-kaleugit-EP-003-01

- EP-003 Task 01 (Critical): car physics extracted to `src/physics/car-physics.js` (`createCarPhysics`) + `src/physics/params.js` (`BASE_PARAMS`); `src/main.js` steps `playerCar` in `tick` and renders from its state; `tests/sim/harness.js` `runRace()`. Bit-exact vs pre-extraction physics (12/12 scratch runs, 3 golden tests). `npm run test:sim` 20/20, `npm test` 2 passed. Stacked on PR #7. UX gate pending human.
