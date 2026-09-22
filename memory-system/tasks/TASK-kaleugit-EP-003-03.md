# TASK-kaleugit-EP-003-03 - Tire/gearbox presets and surface grip

- Status: COMPLETED
- Priority: 2
- Description: Create src/parts/presets.js (TIRES, GEARBOXES, DEFAULT_PARTS=misto/padrao identity, resolveCarParams with upgrades slot); apply grip[surfaceAt(x)] and surfaceDrag in car-physics; one-line param resolution in src/main.js; sand fixture stage in tests/sim/fixtures. CA-008 and CDC-102 non-dominance tests. See docs/EPICO-EP-003-fisica-carro-TASKS.md Task 03.
- Depends On: TASK-kaleugit-EP-003-02
- Blocked By: None
- Branch: TASK-kaleugit-EP-003-03-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-22 00:01
- Started: 2026-09-21 20:42
- Completed: 2026-09-22 00:00
- Planning: memory-system/task-docs/TASK-kaleugit-EP-003-03-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-003-03-implement-report-2026-09-21.md
- prior-art: src/physics/params.js — BASE_PARAMS extended with grip/surfaceDrag; src/track/track.js surfaceAt/SURFACE_TYPES reused; no existing parts/preset code (src/parts/ is new)
- Evidence: PASS — `npm run test:sim` 37/37 (11 new in tests/sim/parts.test.js: identity deep-equal, CA-008 >= 3% per swap (min 5.0%), Off-road 7.68 s vs Estrada 12.70 s on the sand stretch, CDC-102 non-dominance for every tire/gearbox pair + negative control; 3 EP-003-01 goldens unchanged); `npm test` local failure reproduces on unmodified main (low headless FPS), CI authoritative
- Delivery Handoff: DONE (owner: github-actions)
- Delivery PR: #10
- Delivery Status: MERGED
- UX Gate: pending human (batched at epic end) — tire/gearbox differences perceptible; Misto/Padrão keeps the current feel

- Delivery Merged At: 2026-09-22 00:00
## Autonomous Decisions
- DA-001: Tire `grip` is absolute (replaces params.grip) and BASE_PARAMS carries `grip = { dirt: 1, mud: 0.8, sand: 0.75 }` = Misto — Criteria: epic "misto + padrao são identidade" + CDC-102 — Rationale: a Misto grip of 1 everywhere would make Misto dominate Off-road (equal sand grip, higher top speed); keeping Misto's values in BASE_PARAMS keeps `resolveCarParams(BASE_PARAMS, DEFAULT_PARTS)` deep-equal to BASE_PARAMS. Real stages are unaffected (mata-atlantica has no physical zones).
- DA-002: `surfaceDrag` is a speed-proportional coefficient (1/s): `speed -= speed * surfaceDrag * dt` on the ground (`{ dirt: 0, mud: 0.3, sand: 0.35 }`) — Criteria: epic "arrasto extra por superfície, em dados" + KISS — Rationale: calibration showed a constant extra drag stalls Misto/Estrada to 0 on long sand; the proportional form yields a per-tire terminal speed (never a stall).
- DA-003: Gearbox/tire/upgrade multipliers are baked into the resolved accel*/maxSpeed* values (no runtime accelMult); grip is applied at runtime by surface — Criteria: CDC-002 (values in data) + identity requirement — Rationale: x * 1 is exact, so defaults stay bit-identical; physics reads one set of params.
- DA-004: Grip applies to acceleration always (as the original accel did, including airborne); surface drag only on the ground — Criteria: epic formula `accel * accelMult * grip[surfaceAt(x)]` — Rationale: literal formula; drag is a contact effect.
- DA-005: CDC-102 scorecard = terrain (dirt, mud, sand flat 300 m) x metric (race time, max speed, sprint = time to 40 m) — Criteria: epic "terreno ou métrica (tempo, velocidade máxima)" + RF-009 "curta = mais aceleração" — Rationale: with Off-road tires Curta's only advantage is acceleration, which time/max speed over 300 m do not show; the sprint metric measures it directly. A negative-control test proves the check detects a dominant preset.
- DA-006: CA-008 measured on the new sand fixture (dirt [0,100) + sand [100,300)) rather than teste-plano — Criteria: epic Task 03 "Criar tests/sim/fixtures/areia.stage.js" — Rationale: a 200 m sand stretch gives clear differences; teste-plano stays unchanged.
- DA-007: No persona consults — Criteria: runbook (at most 2 lightweight consults; human prefers speed) — Rationale: presets, formula and tests fully specified by the epic Task 03.
- Delivery Merged At: Pending
