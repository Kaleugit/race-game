# Task Planning

## Task Info
- Task ID: TASK-kaleugit-EP-006-03
- Date: 2026-09-21 23:00
- Role/Skill: implement (no persona consults — runbook: speed over ceremony; fully specified UI)
- Execution Mode: Standard
- Branch: TASK-kaleugit-EP-006-03-implement
- Depends On: TASK-kaleugit-EP-006-01

## Summary
- Objective: garage, stage map and result screens as data+callback UI modules plus their index.html markup/CSS. Not wired (owner of main.js/lobby.js wiring: EP-006-04).

## Scope
### In Scope
- index.html (overlays, #end-delta, #end-map, #end-garage, REVANCHE label), src/ui/{format,dom,garage,stage-map,result}.js, tests/sim/format.test.js, docs/INDEX-API.md.

### Out of Scope
- src/main.js, src/lobby.js, src/car.js (EP-006-02 in parallel), e2e for the new flow (EP-006-05).

## Design
- Overlays hidden by default (`.screen-overlay` display none until `.show`; delta/buttons `hidden`), so the current flow is unchanged.
- `#end-lobby-btn` stays (hidden) because main.js binds it at load.
- UI modules import only ./dom.js and ./format.js.
- Mobile landscape: `@media (max-height: 500px)` compaction; garage as right panel so the lobby car stays visible.

## Acceptance Criteria
- AC-001: formatDelta(10, 8.66) === '+1.34s', formatDelta(8, 8.8) === '-0.80s', formatDelta(5, 5) === '+0.00s'.
- AC-002: `grep -nE "from '\.\./main|physics|profile" src/ui/*.js` empty.
- AC-003: `npm run build` green; `npm run test:sim` green; `npm test` 4/4 unchanged.
- AC-004: result sets 2-decimal times + `data-seconds` on #end-player-time / #end-bot-time; locked stage never calls onSelect.
- AC-005 (human): layout approved desktop + mobile landscape — pending, batched at epic end.

## Escalation Check
- Layout fits 740x360 with touch controls; no main.js/lobby.js edit needed. No Mandatory Escalation Condition.

## Execution Plan
1. format.js + test. 2. garage/stage-map/result + dom helpers. 3. index.html markup/CSS. 4. Render check, tests, API index, delivery.
