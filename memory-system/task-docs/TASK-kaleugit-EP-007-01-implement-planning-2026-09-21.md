# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-007-01
- Date: 2026-09-21 21:00
- Role/Skill: implement (no persona consults — DA-006)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-007-01-implement
- Depends On: TASK-kaleugit-EP-003-03

## Summary
- Objective: pure engine model (RPM from speed through a 5-speed automatic gearbox scaled by the EP-003 gearbox preset) consumed later by src/sound.js (EP-007-02).
- Expected result: RPM always in [idle, redline]; each upshift drops RPM by ratio[n+1]/ratio[n]; firingHz 27-133 Hz; Curta shifts earlier in speed than Longa.

## Scope
### In Scope
- `src/audio/engine-model.js` (new): `ENGINE_DEFAULTS`, `scaleGearRatios(ratios, preset)`, `createEngineModel(options)` -> `{ update(dt, { speed, throttle, airborne }), reset(), gearRatios }`.
- `tests/sim/engine-model.test.js` (new) over `runRace` on Mata Atlântica.
- `docs/INDEX-API.md` (regenerated).

### Out of Scope
- `src/sound.js`, `src/main.js` (EP-007-02); physics untouched.

## Requirements
### Functional
- REQ-001: RPM = |speed| / (2*pi*wheelRadius) * 60 * ratio[gear] * finalDrive, clamped to [idle 800, redline 4000]; clutch slip up to launchRpm at low speed.
- REQ-002: upshift at upshiftRpm with RPM drop by the ratio step and a zero-load shift interval; downshift below downshiftRpm.
- REQ-003: airborne free-rev with throttle, rejoin the wheels on landing.
- REQ-004: firingHz = rpm / 60 * cylinders / 2; gear ratios scaled by 1 / GEARBOXES[preset].topSpeedMult.

### Non-Functional
- Pure module: no AudioContext / window / document.

## Acceptance Criteria
- AC-001: RPM in [idle, redline] on every step (3 presets x throttle/turbo drivers on Mata Atlântica).
- AC-002: every upshift ratio within ±5% of ratio[n+1]/ratio[n].
- AC-003: firingHz in [25, 140] Hz.
- AC-004: first upshift speed Curta < Padrão < Longa.
- AC-005: grep AudioContext|window|document in the model is empty.
- AC-006: `npm run test:sim` green.

## Technical Impact
- Files: src/audio/engine-model.js (new), tests/sim/engine-model.test.js (new), docs/INDEX-API.md.
- API/Contract: new module only; imports GEARBOXES from src/parts/presets.js.
- Data Model / Migration Impact: None.

## Execution Plan
1. Model with defaults calibrated against BASE_PARAMS.maxSpeedTurbo. 2. Harness exploration of shifts per preset. 3. Tests. 4. Index regen, validation, delivery.
