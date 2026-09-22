# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-006-01
- Date: 2026-09-21 22:52
- Role/Skill: implement (no persona consults — runbook: speed over ceremony; small pure module)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-006-01-implement
- Depends On: TASK-kaleugit-EP-005-02

## Summary
- Objective: versioned local profile (garage choice + stage progress) under `race_profile_v1`, plus the 10 fixed garage colors. Not wired into main.js yet (owner: EP-006-04).

## Scope
### In Scope
- `src/parts/colors.js`, `src/profile/profile.js`, `tests/sim/profile.test.js`, `docs/INDEX-API.md`.

### Out of Scope
- `src/main.js` / `src/lobby.js` wiring, UI, car visuals, removal of `race_best_time` reads from main.js (EP-006-04).

## Design
- `createProfile(storage = localStorage, stages)`; `stages` = `listStages()` injected (profile.js must not import `stages/index.js`, which needs Vite `import.meta.glob`).
- Stored JSON `{ version: 1, garage: { color, tire, gearbox, upgrades: {} }, progress: { unlocked, best } }`; every field sanitized on load (unknown ids -> defaults; first stage always unlocked; best only positive finite numbers).
- Every storage access in try/catch; `null` storage = memory-only profile.
- Legacy `race_best_time` read only; copied into `progress.best['mata-atlantica']` when that is empty; never written or removed.

## Acceptance Criteria
- AC-001: empty storage -> only mata-atlantica unlocked; garage = DEFAULT_COLOR + DEFAULT_PARTS.
- AC-002: recordWin('mata-atlantica') -> new profile on same storage has isUnlocked('cerrado') === true.
- AC-003: corrupted JSON / unknown ids -> defaults, no throw.
- AC-004: race_best_time preserved byte for byte.
- AC-005: CAR_COLORS.length === 10.
- AC-006: bot params independent of the saved garage (CA-007 unit part).
- AC-007: `npm run test:sim` green.

## Escalation Check
- No destructive migration of `race_best_time`; no main.js edit needed. No Mandatory Escalation Condition.

## Execution Plan
1. colors.js + profile.js. 2. profile.test.js. 3. API index, validation, delivery.
