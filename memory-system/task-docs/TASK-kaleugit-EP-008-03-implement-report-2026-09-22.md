# Task Report (Minimal)

## Task Info
- Task ID: TASK-kaleugit-EP-008-03
- Date Started: 2026-09-22 01:00
- Date Completed: 2026-09-22 01:30
- Role/Skill: implement (parts data + car physics + engine sound)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-008-03-implement
- Planning Doc: TASK-kaleugit-EP-008-03-implement-planning-2026-09-22.md

## Summary
- `src/physics/params.js`: `BASE_PARAMS.mass` (1 = original car) and `BASE_PARAMS.turboCapacity` (1 = original tank). `src/physics/car-physics.js`: throttle/turbo acceleration, air torque and landing rebound are divided by `mass`; turbo burn and recharge rates are divided by `turboCapacity` (fuel stays 0..1, so `turboReigniteFuel` stays a fraction of the tank). With 1 every division is exact: EP-003-01 goldens unchanged at 1e-9, and default-part races are sample-for-sample identical on every stage.
- `src/parts/presets.js`: ENGINES `e16`/`e20`/`e24` (labels 1.6 / 2.0 / 2.4), CHASSIS `leve`/`medio`/`pesado`, TANKS `pequeno`/`medio`/`grande` (PT-BR labels); DEFAULT_PARTS = `{ tire: 'misto', gearbox: 'padrao', engine: 'e20', chassis: 'medio', tank: 'medio' }`; resolveCarParams takes optional engine/chassis/tank (default = DEFAULT_PARTS, so the current `{ color, tire, gearbox }` garage keeps working) and throws on unknown ids.
- `src/audio/engine-model.js`: `createEngineModel({ engine })` merges `ENGINES[engine].sound` (idle/redline/shift/launch RPM) under explicit options and returns the resolved `config`; default `e20` has no override (ENGINE_DEFAULTS, EP-008-02 criteria unchanged). `src/sound.js`: `update(dt, { ..., engine })` rebuilds the model on change, normalizes RPM by the engine's range and scales the filter/combustion band by `ENGINES[engine].timbre` (1.6 brighter 1.12, 2.4 deeper 0.88; 2.0 = 1, identical synth).
- `src/bot/bot-preset.js`: BOT_DEFAULT_PARTS extended with the new defaults (bot params still == BASE_PARAMS; CA-004 unchanged).

## Part values (trade-offs)
| Part | accel | top speed | mass | turbo | sound |
|---|---|---|---|---|---|
| Motor 1.6 (`e16`) | x0.95 | x0.95 | x0.90 | burn x0.85 (longer) | idle 850 / redline 4400, brighter |
| Motor 2.0 (`e20`, default) | 1 | 1 | 1 | 1 | ENGINE_DEFAULTS |
| Motor 2.4 (`e24`) | x1.08 | x1.06 | x1.10 | burn x1.18 (shorter) | idle 750 / redline 3700, deeper |
| Chassi Leve / Médio / Pesado | — | — | 0.88 / 1 / 1.14 | — | — |
| Tanque Pequeno / Médio / Grande | — | — | 0.96 / 1 / 1.05 | capacity 0.7 / 1 / 1.4 | — |
- Net thrust = accel / mass: 1.6 sprints harder but tops out lower and is less stable; 2.4 has the top speed and landing stability but burns the turbo 18% faster and sprints slower.

## Measured (dt 1/60, only the named part swapped from the defaults)
- Sand fixture (constant Up, CA-008 track), race time / top speed: 1.6 -1.8% / -4.9%; 2.4 -1.1% / +6.0%; Leve -9.1%; Pesado +11.9%; Pequeno -3.1%; Grande +4.2%.
- Turbo time per full tank (hold Up+Space): default 3.02 s; 1.6 3.53 s (+17%); 2.4 2.55 s (-15.5%); Pequeno 2.12 s (-30%); Grande 4.22 s (+40%).
- Mata Atlântica, constant Up+Space: default 43.02 s; 1.6 43.92; 2.4 41.70; Leve 42.25; Pesado 43.93; Pequeno 43.50; Grande 42.72.
- Landing rebound after an 18 m drop: Leve 0.105 m, Médio 0.080 m, Pesado 0.059 m.

## CDC-102 analysis
- Scorecard (higher = better): per terrain (dirt/mud/sand flat 300 m) race time, top speed, 0–40 m sprint with constant Up; turbo time per tank; landing stability (rebound rounded to 1 mm).
- All 243 builds (3^5) computed. For every build and every single-part swap (all 5 kinds), each side wins at least one metric: 0 failures. No build is superior to every other.
- Cross-part pairs: 323 of 58 806 ordered build pairs are Pareto-dominated when several parts change at once (e.g. 1.6 + Pequeno vs 2.0 + Leve + Médio): the 1.6's advantages (lower mass, turbo economy) can be bought with the chassis/tank. Parts are all free (DA-007), so this is a weak build, not pay-to-win; recorded as DA-002.

## Acceptance Criteria Status
| Criterion | Result | Evidence |
|---|---|---|
| AC-001 identity + goldens | PASS | parts-rf012.test.js (deep-equal, bit-identical samples on every stage), car-physics.test.js unchanged |
| AC-002 CA-010 >= 3% | PASS | parts-rf012.test.js "CA-010: every engine, chassis and tank swap ..." |
| AC-003 CDC-102 | PASS | parts-rf012.test.js (243 contexts, no universal best, non-vacuous) |
| AC-004 engine sound variant | PASS | parts-rf012.test.js engine test; engine-model.test.js unchanged and green |
| AC-005 test suites | PASS | see Test Evidence |

## Test Evidence
- `npm run test:sim` -> PASS (102/102)
- `./scripts/validate-changed.sh` -> PASS
- `./scripts/validate-all.sh` -> N/A locally (TD-001/TD-002); CI runs it
- `npm test` -> PASS (9/9)

## Files Changed
- src/parts/presets.js
- src/physics/params.js
- src/physics/car-physics.js
- src/audio/engine-model.js
- src/sound.js
- src/bot/bot-preset.js
- tests/sim/parts-rf012.test.js (new)
- tests/sim/parts.test.js, tests/sim/bot.test.js, tests/sim/profile.test.js (default-part shape only)
- docs/INDEX-API.md

## Completion Checklist
- [x] Task marked `COMPLETED`
- [x] `Last Updated` refreshed in task file
- [x] Session log updated
- [x] No unresolved semantic ambiguity
