# Task Report

## Task Info
- Task ID: TASK-kaleugit-EP-003-03
- Date Started: 2026-09-21 20:42
- Date Completed: 2026-09-21 20:57
- Role/Skill: implement
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-003-03-implement
- Planning Doc: TASK-kaleugit-EP-003-03-implement-planning-2026-09-21.md

## Summary
- `src/parts/presets.js`: `TIRES` (Estrada top speed 1.05, grip dirt/mud/sand 1.0/0.6/0.55; Misto 1, 1/0.8/0.75; Off-road 0.94, 0.95/0.95/1.0), `GEARBOXES` (Curta accel 1.15 / top 0.93; Padrão 1/1; Longa 0.88/1.06), `DEFAULT_PARTS = { tire: 'misto', gearbox: 'padrao' }`, `resolveCarParams(base, { tire, gearbox, upgrades = [] })` -> frozen params (accel keys x accelMult, top-speed keys x topSpeedMult, `grip` from the tire; upgrades multiply on top).
- Physics: acceleration x `grip[track.surfaceAt(x)]`; on the ground an extra drag `speed * surfaceDrag[surface] * dt` (BASE_PARAMS `surfaceDrag = { dirt: 0, mud: 0.3, sand: 0.35 }`, 1/s), which gives each tire a terminal speed `(accel * grip - drag) / surfaceDrag` on loose surfaces instead of a stall.
- Misto + Padrão is the identity (deep-equal to BASE_PARAMS). Dirt math is bit-identical (grip 1, no extra drag), so the EP-003-01 goldens pass unchanged.
- `src/main.js`: `params: resolveCarParams(BASE_PARAMS, DEFAULT_PARTS)`.

## Calibration (harness, constant up, dt 1/60)
| Preset (tire/gearbox) | Sand fixture time | Max speed | Time on the sand stretch |
|---|---|---|---|
| misto/padrao (ref) | 13.900 s | 27.945 | 8.967 s |
| estrada/padrao | 17.517 s (+26.0%) | 29.333 (+5.0%) | 12.700 s |
| offroad/padrao | 12.850 s (-7.6%) | 26.266 (-6.0%) | 7.683 s |
| misto/curta | 12.950 s (-6.8%) | 26.033 (-6.8%) | 8.050 s |
| misto/longa | 15.117 s (+8.8%) | 29.583 (+5.9%) | 10.050 s |
- Flat 300 m dirt: estrada 11.667 s < longa 11.850 < misto 12.117 < curta 12.617 < offroad 12.817 (top speed wins on dirt).
- mata-atlantica (all dirt): all 7 checked combos finish; estrada/padrao and misto/longa touch the chassis on a landing (faster jumps), no auto-right needed.

## Acceptance Criteria Status
| Criterion | Result (PASS/FAIL) | Evidence |
|---|---|---|
| AC-001 CA-008 >= 3% | PASS | table above; smallest difference 5.0% (estrada max speed) |
| AC-002 CA-008 sand | PASS | offroad 7.683 s vs estrada 12.700 s on the sand stretch |
| AC-003 CDC-102 | PASS | every tire pair (3 gearboxes) and gearbox pair (3 tires) non-dominant over dirt/mud/sand x time/max speed/sprint; negative control (a tire better everywhere) is detected |
| AC-004 identity | PASS | `resolveCarParams(BASE_PARAMS, DEFAULT_PARTS)` deep-equal `{ ...BASE_PARAMS }` |
| AC-005 tests | PASS (sim) / CI (e2e) | `npm run test:sim` 37/37; `npm test` fails locally on unmodified main too (see below); CI is authoritative |
| UX gate | PENDING HUMAN | batched at epic end |

## Requirement Traceability
| Requirement | Criterion | Test/Check | Result |
|---|---|---|---|
| REQ-001 | AC-001, AC-002, AC-003 | parts.test.js CA-008 + CDC-102 tire test | PASS |
| REQ-002 | AC-001, AC-003 | parts.test.js CA-008 + CDC-102 gearbox test | PASS |
| REQ-003 | AC-004 | identity, upgrades, unknown-id tests | PASS |
| NFR | AC-005 | 3 goldens unchanged at 1e-9; dirt grip-independence test | PASS |

## Test Evidence
- `npm run test:sim` -> PASS (37/37: 11 new in tests/sim/parts.test.js + 26 existing, goldens untouched)
- `npm test` -> local FAIL, environmental: `#countdown-overlay` never hides within 15 s because headless FPS is very low on this machine (tick dt capped at 0.05, so game time runs slower than real time). The same failure reproduces on unmodified main (`git stash -u` baseline run). CI is the gate.
- `./scripts/validate-changed.sh` -> PASS
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it

## Notes For The UX Gate
- Only teste-plano has physical zones today (sand [60,90), mud [120,150)); mata-atlantica is all dirt, so the default car there feels exactly as before. On teste-plano the zones now slow the default car (Misto sand terminal ~20 m/s).
- Estrada in sand is harsh (terminal ~12 m/s): intentional for a visible trade-off; tune `surfaceDrag`/grip in data if it feels too punishing.

## Files Changed
- src/parts/presets.js (new), src/physics/params.js, src/physics/car-physics.js, src/main.js, tests/sim/fixtures/areia.stage.js (new), tests/sim/parts.test.js (new), docs/INDEX-API.md (regenerated)
- docs/EPICO-EP-003-fisica-carro-TASKS.md (status), task file, planning/report/validation notes, session-log and development notes fragments

## Completion Checklist
- [x] Task marked `COMPLETED`
- [x] `Last Updated` refreshed in task file
- [x] Session log updated
- [x] No unresolved semantic ambiguity
