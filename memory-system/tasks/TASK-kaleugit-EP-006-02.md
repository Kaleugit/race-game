# TASK-kaleugit-EP-006-02 - Car visual: color and tires

- Status: COMPLETED
- Priority: 2
- Description: In src/car.js export applyCarLook(carBuilt, {color, tire}) for body color and per-preset tire look, low-poly style; makeCar() without args unchanged. Only src/car.js changes; human UX gate on visuals. See docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md Task 02.
- Depends On: TASK-kaleugit-EP-006-01
- Blocked By: None
- Branch: TASK-kaleugit-EP-006-02-implement
- Workstreams: [development]
- Execution Mode: Quick
- Last Updated: 2026-09-21 23:10
- Started: 2026-09-21 23:00
- Completed: 2026-09-21 23:10
- Report: memory-system/task-docs/TASK-kaleugit-EP-006-02-implement-report-2026-09-21.md
- prior-art: src/car.js makeTireSideTexture/makeCar/makeBesouro (materials, 16 lug boxes per wheel); src/parts/colors.js getCarColor; src/parts/presets.js TIRES ids
- Evidence: PASS — tests/sim/car-look.test.js 6/6 (makeCar() original look; vermelho+misto identity snapshot; all 10 colors; 3 distinct tires; partial/unknown ids; Besouro + GLB no-op); `npm run test:sim` 79/79; `npm run build` PASS; `npm test` 4/4; only src/car.js changed in src/
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: Pending
- Delivery Status: PR_OPEN

## Autonomous Decisions
- DA-001: Tire look = scale of the existing tread lug boxes + tread shade + sidewall texture variant (no new geometry) — Criteria: CDC-101 / escalation condition (no off-style geometry) — Rationale: distinct looks (near-slick estrada, chunky offroad) while staying low-poly.
- DA-002: Body trims (Bandeirante creases, Besouro hood/deck) follow the body color with the original lightness ratio; very dark bodies get a lighter trim — Criteria: visual coherence — Rationale: a fixed dark-red crease would look wrong on other colors.
- DA-003: applyCarLook accepts a CAR_COLORS id or a hex number; omitted fields untouched; unknown ids throw — Criteria: consistent with resolveCarParams — Rationale: garage ids are validated by the profile; hex keeps the epic's wording.
- DA-004: makeCar(look?) optional parameter; makeCarGLB has no look handle (no-op) — Criteria: task "makeCar() sem argumentos identico" — Rationale: convenience for EP-006-04 without changing the no-arg path; GLB material mapping out of scope.
- DA-005: No persona consults — Criteria: runbook (Quick) — Rationale: one file, visual only.
- UX Gate: pending human (batched at epic end).
