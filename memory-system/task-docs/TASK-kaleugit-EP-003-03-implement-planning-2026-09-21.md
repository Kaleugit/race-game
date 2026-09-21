# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-003-03
- Date: 2026-09-21 20:42
- Role/Skill: implement (no persona consults — DA-007)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-003-03-implement
- Depends On: TASK-kaleugit-EP-003-02

## Summary
- Objective: tire (Estrada/Misto/Off-road) and gearbox (Curta/Padrão/Longa) presets resolved into car params, and surface-dependent traction (grip) and drag in the physics module.
- Expected result: Misto + Padrão is the identity over BASE_PARAMS (EP-003-01 goldens unchanged); swaps change time or max speed by >= 3%; Off-road beats Estrada on sand; no preset strictly dominant (CDC-102).

## Scope
### In Scope
- `src/parts/presets.js` (new): `TIRES`, `GEARBOXES`, `DEFAULT_PARTS`, `resolveCarParams(base, { tire, gearbox, upgrades })`.
- `src/physics/params.js`: `grip` (= Misto values) and `surfaceDrag` in BASE_PARAMS.
- `src/physics/car-physics.js`: `accel *= grip[surfaceAt(x)]`; speed-proportional `surfaceDrag` on the ground.
- `src/main.js`: one line, `params: resolveCarParams(BASE_PARAMS, DEFAULT_PARTS)` (+ import).
- `tests/sim/fixtures/areia.stage.js` (new), `tests/sim/parts.test.js` (new).

### Out of Scope
- Garage UI/persistence (EP-006), Cerrado stage re-check (EP-005-02), bot (EP-004).

## Requirements
### Functional
- REQ-001 (RF-008): tires trade top speed vs. grip by surface; Off-road grips best on sand.
- REQ-002 (RF-009): gearboxes trade acceleration vs. top speed (automatic, multipliers only).
- REQ-003: `resolveCarParams` with an `upgrades` multiplier list; default parts are the identity.

### Non-Functional
- Physics module stays pure; dirt behavior bit-identical (goldens at 1e-9).

## Acceptance Criteria
- AC-001 (CA-008): constant `up` on the sand fixture, each tire swap and each gearbox swap vs. Misto/Padrão changes finish time or max speed by >= 3%.
- AC-002 (CA-008): on the sand stretch Off-road is faster than Estrada.
- AC-003 (CDC-102): for each tire pair (every gearbox) and each gearbox pair (every tire), each one wins at least one terrain (dirt, mud, sand) x metric (time, max speed, sprint to 40 m).
- AC-004: `resolveCarParams(BASE_PARAMS, DEFAULT_PARTS)` deep-equals BASE_PARAMS.
- AC-005: `npm run test:sim` and `npm test` green.
- UX gate (human only): differences perceptible; Misto/Padrão keeps the current feel.

## Technical Impact
- Files: src/parts/presets.js (new), src/physics/params.js, src/physics/car-physics.js, src/main.js, tests/sim/fixtures/areia.stage.js (new), tests/sim/parts.test.js (new), docs/INDEX-API.md (regenerated).
- API/Contract: params gain `grip` and `surfaceDrag`; the track passed to createCarPhysics must provide `surfaceAt` (createTrack already does).
- Data Model / Migration Impact: None.

## Execution Plan
1. Params + physics grip/drag. 2. Presets + resolver. 3. main.js one line. 4. Fixture + calibration with the harness. 5. Tests (CA-008, CDC-102 + negative control, identity). 6. e2e.

## Test Plan
- REQ-001/002 -> AC-001/AC-002 -> parts.test.js CA-008 tests
- REQ-001/002 -> AC-003 -> parts.test.js CDC-102 tests + non-vacuity control
- REQ-003 -> AC-004 -> identity/upgrade/unknown-id tests
- NFR -> AC-005 -> goldens unchanged, `npm test`

## Risks / Open Questions
- A constant surface drag stalls the car on long sand (found in calibration) -> drag proportional to speed (terminal speed per tire).
- With Off-road, sand terminal speed exceeds top speed, so Curta's advantage only shows in acceleration -> sprint metric (RF-009 "curta = mais aceleração").
- No Mandatory Escalation Condition identified.

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
