# TASK-kaleugit-EP-006-01 - Local profile: garage and progress in localStorage

- Status: COMPLETED
- Priority: 1
- Description: Create src/parts/colors.js (10 CAR_COLORS, DEFAULT_COLOR) and src/profile/profile.js (createProfile(storage, stages): getGarage/saveGarage/getUnlocked/isUnlocked/recordWin) under key race_profile_v1 with version and upgrades slot; never destroy race_best_time; tests/sim/profile.test.js. See docs/EPICO-EP-006-telas-garagem-progressao-TASKS.md Task 01.
- Depends On: TASK-kaleugit-EP-005-02
- Blocked By: None
- Branch: TASK-kaleugit-EP-006-01-implement
- Workstreams: [development]
- Execution Mode: Standard
- Last Updated: 2026-09-21 23:05
- Started: 2026-09-21 22:52
- Completed: 2026-09-21 23:05
- Planning: memory-system/task-docs/TASK-kaleugit-EP-006-01-implement-planning-2026-09-21.md
- Report: memory-system/task-docs/TASK-kaleugit-EP-006-01-implement-report-2026-09-21.md
- prior-art: src/parts/presets.js (TIRES/GEARBOXES/DEFAULT_PARTS ids and frozen-preset pattern); src/bot/bot-preset.js (resolveBotParams, bot preset independent of the player); src/main.js:326-348 (current race_best_time read/write, left intact); tests/sim/load-stages.js (Node stage registry)
- Evidence: PASS — tests/sim/profile.test.js 10/10 (empty storage -> only mata-atlantica + DEFAULT_COLOR/DEFAULT_PARTS; recordWin('mata-atlantica') -> isUnlocked('cerrado') on a new profile over the same storage; corrupted JSON / unknown ids / throwing storage -> defaults, no throw; race_best_time preserved byte for byte; CAR_COLORS.length === 10; bot params independent of the saved garage); `npm run test:sim` 73/73; `npm run build` PASS; `npm test` 4/4; src/main.js untouched
- Delivery Handoff: DONE (owner: gohorse/subagent)
- Delivery PR: Pending
- Delivery Status: PR_OPEN

## Autonomous Decisions
- DA-001: Garage `color` stores a CAR_COLORS id (`DEFAULT_COLOR = 'vermelho'`, hex 0xb71f1f = original bodyMat), not a hex; `getCarColor(id)` maps it — Criteria: CDC-006 + CDC-104 — Rationale: ids survive palette tweaks and validate trivially; EP-006-02/04 pass `getCarColor(id).hex` to applyCarLook.
- DA-002: `getGarage()` returns `{ color, tire, gearbox }` only; `garage.upgrades` stays in the stored JSON untouched (reserved) — Criteria: epic Task 04 (`resolveCarParams(BASE_PARAMS, profile.getGarage())`) — Rationale: resolveCarParams expects `upgrades` as an array; exposing the `{}` slot would make that call throw. Future upgrades map the slot to the array without migration.
- DA-003: Added `getBest(stageId)` and a `{ best, isNewBest, unlockedId }` return from `recordWin` beyond the listed API — Criteria: epic Task 04 (remove race_best_time from main.js; result shows best time) — Rationale: main.js needs the best time from the profile; minimal addition.
- DA-004: `stages` is injected (`listStages()`), profile.js does not import stages/index.js — Criteria: CDC-001 — Rationale: stages/index.js uses Vite import.meta.glob and cannot load under node --test.
- DA-005: The legacy best is copied on load and persisted into race_profile_v1 only; race_best_time is never written/removed. main.js keeps its current race_best_time reads until EP-006-04 — Criteria: DA-001 of the epic + CDC-006 — Rationale: non-destructive; Task 01 must not edit main.js.
- DA-006: No persona consults — Criteria: runbook (speed over ceremony) — Rationale: small pure module with fully specified shape.
- UX Gate: N/A (no visual change in this task).
