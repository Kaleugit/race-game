# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-007-02
- Date: 2026-09-21 21:15
- Role/Skill: implement (no persona consults — DA-008)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-007-02-implement
- Depends On: TASK-kaleugit-EP-007-01

## Summary
- Objective: rewrite src/sound.js as an engine-order synth driven by createEngineModel; realistic shifts and a lower pitch (firing 27-133 Hz).

## Scope
### In Scope
- `src/sound.js`: orders 0.5/1/2/4 of crank Hz with light detune, per-order gains by load, lowpass tracking rpm+load, combustion noise AM at firingHz, turbo hiss/whine + blow-off; remove GEARS/virtualSf/shiftDip/overdrive; keep `{ start, update, stop }`.
- `src/main.js`: the single `engineSound.update(...)` call.
- `docs/INDEX-API.md` (regenerated).

### Out of Scope
- Physics, engine model, other sounds.

## Requirements
- REQ-001: pitch from engine model RPM (crank Hz = rpm/60; firing = order 2).
- REQ-002: load drives order gains and filter; shifting (load 0) audibly dips.
- REQ-003: engine model reset on race restart.
- NFR: no console errors with audio active.

## Acceptance Criteria
- AC-001: grep `GEARS\|virtualSf\|overdriveFreq` in src/sound.js empty.
- AC-002: `npm test` green.
- AC-003: public API `{ start, update, stop }` kept.
- AC-004: UX gate (human): shift realism and lower tone — pending human.

## Execution Plan
1. Rewrite sound.js. 2. Wire main.js. 3. Mock-AudioContext scratch run, test:sim, e2e. 4. Index regen, validation, delivery.
