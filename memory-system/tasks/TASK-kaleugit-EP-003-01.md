# TASK-kaleugit-EP-003-01 - Extract per-instance car physics + simulation harness

- Status: PENDING
- Priority: 1
- Description: Create src/physics/params.js (BASE_PARAMS = current constants; CHASSIS_HITBOX/SUSP_* moved from src/car.js and re-exported) and DOM-free src/physics/car-physics.js (createCarPhysics({track, params}) -> state, step(dt, input), reset()) porting turbo/speed/physics/rotation/suspension with identical math; wire playerCar.step in src/main.js tick; create tests/sim/harness.js runRace(). Critical: high regression risk on driving feel; human UX gate. See docs/EPICO-EP-003-fisica-carro-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-002-03
- Blocked By: None
- Branch: TASK-kaleugit-EP-003-01-implement
- Workstreams: None
- Execution Mode: Critical
- Last Updated: 2026-09-21 19:00
