# 2026-09-21 — TASK-kaleugit-EP-006-02

- applyCarLook(carBuilt, { color, tire }): color = CAR_COLORS id or hex; tire = TIRES id; omitted fields unchanged; unknown ids throw. Also makeCar({ color, tire }).
- Works on makeCar()/makeBesouro() via their `look` handle; makeCarGLB() has none (returned unchanged).
- Per-tire visuals live in TIRE_LOOKS at the top of src/car.js (tuning knob for the UX gate).
- car.js can be imported in Node with a document/canvas stub (see tests/sim/car-look.test.js).
