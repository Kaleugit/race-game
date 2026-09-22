# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-008-03
- Date: 2026-09-22 01:00
- Role/Skill: implement (parts data + car physics + engine sound, no persona consults)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-008-03-implement
- Depends On: TASK-kaleugit-EP-008-05

## Summary
- Objective: RF-012 parts — 3 engines (1.6 / 2.0 / 2.4), 3 chassis (Leve / Médio / Pesado), 3 turbo tanks (Pequeno / Médio / Grande) as trade-offs; current parts = defaults with bit-identical physics; engine slightly changes the engine sound.
- Expected result: CA-010 green in `npm run test:sim`; EP-003-01 goldens unchanged; bot and CA-004 unaffected.

## Scope
### In Scope
- `src/parts/presets.js` (ENGINES, CHASSIS, TANKS, DEFAULT_PARTS, resolveCarParams), `src/physics/params.js` (`mass`, `turboCapacity`), `src/physics/car-physics.js`, `src/audio/engine-model.js` (`engine` option, `config`), `src/sound.js` (`engine` in update, timbre), `src/bot/bot-preset.js` (BOT_DEFAULT_PARTS), new `tests/sim/parts-rf012.test.js`, shape assertions in parts/bot/profile sim tests.
### Out of Scope
- Garage UI, profile persistence, main.js wiring and turbo HUD (EP-008-04).

## Requirements
### Functional
- REQ-001: default parts resolve to BASE_PARAMS (deep-equal) and keep physics bit-identical.
- REQ-002: each engine/chassis/tank swap changes race time, top speed or turbo time by >= 3% (CA-010).
- REQ-003: no part strictly dominant (CDC-102) across terrain x metric; no build superior to every other.
- REQ-004: engine preset slightly changes the engine sound; default engine = current sound.
- REQ-005: bot unaffected (BOT_DEFAULT_PARTS = defaults).

## Acceptance Criteria
- AC-001: identity + goldens (car-physics.test.js unchanged, 1e-9).
- AC-002: CA-010 >= 3% test.
- AC-003: CDC-102 non-dominance for every part swap in all 243 contexts; no universal best build; non-vacuous check.
- AC-004: engine sound variant test (RPM range, shift points, timbre); EP-008-02 criteria still green for the default engine.
- AC-005: `npm run test:sim` and `npm test` green.

## Technical Impact
- API/Contract Impact: new exports ENGINES, CHASSIS, TANKS; DEFAULT_PARTS / BOT_DEFAULT_PARTS gain engine/chassis/tank; resolveCarParams accepts optional engine/chassis/tank (default = DEFAULT_PARTS); BASE_PARAMS gains `mass`, `turboCapacity`; createEngineModel accepts `engine` and returns `config`; engineSound.update accepts `engine`.
- Data Model / Migration Impact: None (profile unchanged; EP-008-04).

## Execution Plan
1. Physics params (mass divides thrust accel, air torque, landing rebound; turboCapacity divides burn/recharge) with 1 = exact identity.
2. Presets + resolveCarParams; engine turbo burn as the HP trade-off.
3. Engine sound variant through createEngineModel options.
4. Scorecard (terrain x time/top speed/sprint + turbo time + landing stability) over all 243 builds; tune values.

## Test Plan
- Levels: unit/sim + e2e regression
- REQ-001..005 -> AC-001..004 -> tests/sim/parts-rf012.test.js, car-physics.test.js
- AC-005 -> `npm run test:sim`, `npm test`

## Risks / Open Questions
- Full pairwise non-dominance across all builds is not achievable with substitutable parts (mass from engine vs chassis): interpreted CA-010 as per-part non-dominance in every context + no universal best build (DA-002).

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
