# TASK-kaleugit-EP-008-03 - Engines, chassis and turbo tanks (data + physics + sound)

- Status: COMPLETED
- Priority: 1
- Description: ENGINES/CHASSIS/TANKS presets in src/parts/presets.js as trade-offs (current parts = defaults, physics identical, goldens green), new physics params (mass, tank capacity), engine variant slightly changes engine sound; CA-010 tests (>=3% per swap, CDC-102 non-dominance). See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 03.
- Depends On: TASK-kaleugit-EP-008-05
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-03-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 01:20
- Started: 2026-09-22 01:00
- Completed: 2026-09-22 01:20
- Planning: memory-system/task-docs/TASK-kaleugit-EP-008-03-implement-planning-2026-09-22.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-03-implement-report-2026-09-22.md
- prior-art: src/parts/presets.js TIRES/GEARBOXES + resolveCarParams (EP-003-03) extended; tests/sim/parts.test.js scorecard/assertNoDominance pattern reused and extended with turbo-time and landing-stability metrics; createEngineModel options (EP-007-01) used for the engine sound variant
- Evidence: PASS — CA-010 swaps (sand fixture time/top speed, turbo time) 1.6 -4.9% top speed / +17% turbo, 2.4 +6.0% / -15.5%, Leve -9.1% time, Pesado +11.9%, Pequeno -30% turbo, Grande +40%; CDC-102 per-part non-dominance in all 243 builds; defaults bit-identical; goldens unchanged; `npm run test:sim` 102/102; `./scripts/validate-changed.sh` PASS; `npm test` 9/9
- UX Gate: pending human (batched at epic end) — engine sound variants (EP-008-04 wires them), feel of mass/tank trade-offs
- Delivery Handoff: DONE (owner: skills/delivery)
- Delivery PR: #29
- Delivery Status: PR_OPEN_MANUAL_MERGE

## Autonomous Decisions
- DA-001: Mass as one relative param dividing thrust accel, air torque and landing rebound; tank as turboCapacity dividing burn/recharge — Criteria: task (new physics params mass + tank capacity, default identical) — Rationale: x/1 is exact, so defaults are bit-identical; one param gives engine/chassis/tank weight a consistent meaning.
- DA-002: CA-010 non-dominance checked per part in every context of the other parts (243 builds) + no universal best build — Criteria: CDC-102 / CA-010 — Rationale: full Pareto non-dominance across multi-part changes is impossible with substitutable weight (323/58806 ordered pairs); parts are all free (DA-007), so a weaker build is a choice, not pay-to-win.
- DA-003: Engine HP trade-off = mass + turbo burn (turboBurnMult); 2.4 net sprint slower than 2.0 — Criteria: CDC-102 — Rationale: with accel-only mass cost the 2.4 dominated; thirstier big engine is intuitive.
- DA-004: Profile/garage/main.js untouched (EP-008-04); profile.test DEFAULT_GARAGE pinned to color/tire/gearbox — Criteria: epic file ownership — Rationale: resolveCarParams defaults missing parts.
- DA-005: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: data + contained physics params, fully measured.
- Delivery Merged At: Pending
