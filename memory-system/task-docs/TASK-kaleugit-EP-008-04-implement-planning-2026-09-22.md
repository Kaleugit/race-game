# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-008-04
- Date: 2026-09-22 11:05
- Role/Skill: implement (garage UI + profile + main.js wiring, no persona consults)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-008-04-implement
- Depends On: TASK-kaleugit-EP-008-03, TASK-kaleugit-EP-006-05

## Summary
- Objective: make engine (1.6/2.0/2.4), chassis (Leve/Médio/Pesado) and turbo tank (Pequeno/Médio/Grande) selectable in the garage, persisted in `race_profile_v1`, applied to physics/sound at every race, tank capacity visible in the turbo HUD.
- Expected result: `npm run test:sim` and `npm test` green; old profiles load the new parts as defaults; garage still fits mobile landscape.

## Scope
### In Scope
- `src/ui/garage.js`, `index.html` (3 new rows + layout), `src/lobby.js` (passes ENGINES/CHASSIS/TANKS), `src/profile/profile.js`, `src/main.js`, `tests/sim/profile.test.js`, `tests/e2e/parts.spec.js` (new), `tests/e2e/drive.js` (pickGarage fields).
### Out of Scope
- Part values/physics (EP-008-03), bot.

## Requirements
### Functional
- REQ-001: garage rows `[data-engine]`, `[data-chassis]`, `[data-tank]` with PT-BR trade-off labels derived from the presets.
- REQ-002: profile saves/loads engine/chassis/tank; missing/unknown ids -> DEFAULT_PARTS; no destructive migration.
- REQ-003: main.js resolves all 5 parts every race, passes `engine` to the engine sound, turbo bar sized by `turboCapacity`.
- REQ-004: garage fits mobile landscape (640x360 / 740x360).

## Acceptance Criteria
- AC-001: old profile without the new parts loads with defaults; stored JSON untouched until a save (profile.test.js).
- AC-002: e2e: the 3 choices survive a reload and reach the race (#hud data-engine / data-turbo-capacity / data-mass, 17-cell turbo bar for Grande).
- AC-003: e2e: garage panel has no overflow and every control is inside a 640x360 and a 740x360 viewport.
- AC-004: `npm run test:sim`, `npm test`, `./scripts/validate-changed.sh` green.

## Technical Impact
- API/Contract Impact: `profile.getGarage()`/`saveGarage()` gain engine/chassis/tank; `showGarage` takes `engines`, `chassis`, `tanks`; new exports engineTradeoff/chassisTradeoff/tankTradeoff; `#hud` data-engine/data-turbo-capacity/data-mass.
- Data Model / Migration Impact: `race_profile_v1.garage` gains 3 optional fields; version stays 1; old profiles read as defaults and are rewritten only on the next save/win.

## Execution Plan
1. Profile sanitize + getGarage.
2. Garage rows + labels + responsive layout.
3. main.js wiring (params, sound, turbo bar).
4. Sim + e2e tests.

## Test Plan
- REQ-002 -> AC-001 -> tests/sim/profile.test.js
- REQ-001/003 -> AC-002 -> tests/e2e/parts.spec.js
- REQ-004 -> AC-003 -> tests/e2e/parts.spec.js
- AC-004 -> suites

## Risks / Open Questions
- Six garage rows do not fit ~360 px of height with per-button labels: short-landscape mode shows the selected option's label per row instead (DA-001).

## Ready Checklist
- [x] Task status set to `IN_PROGRESS`
- [x] Acceptance criteria are testable
- [x] Test commands/checks defined
- [x] No unresolved ambiguity with human
