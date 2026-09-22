# TASK-kaleugit-EP-008-08 - Swap 1.6 and 2.4 engine sounds

- Status: COMPLETED
- Priority: 1
- Description: Manager UX feedback (2026-09-22): the 1.6 engine sound is very good; swap the 1.6 and 2.4 sounds (ENGINES e16/e24 `sound` + `timbre`). Physics unchanged. See docs/EPICO-EP-008-pecas-corridas-curtas-TASKS.md Task 08.
- Depends On: TASK-kaleugit-EP-008-03
- Blocked By: None
- Branch: TASK-kaleugit-EP-008-08-implement
- Workstreams: [development]
- Execution Mode: Quick
- Last Updated: 2026-09-22 12:23
- Started: 2026-09-22 12:16
- Completed: 2026-09-22 12:23
- Report: memory-system/task-docs/TASK-kaleugit-EP-008-08-implement-report-2026-09-22.md
- prior-art: ENGINES presets in src/parts/presets.js (EP-008-03); only existing `sound`/`timbre` fields swapped, no new code
- Evidence: PASS — `npm run test:sim` 104/104; `./scripts/validate-changed.sh` PASS; `npm test` 12/12
- UX Gate: pending human (hearing approval)
- Delivery Handoff: DONE (owner: skills/delivery)

## Autonomous Decisions
- DA-001: "trocar ele com o do 2.4" read as a swap (2.4 gets the 1.6 sound, 1.6 gets the 2.4 sound); sound-order test assertions updated to the new spec — Criteria: human decision > task artifacts — Rationale: the manager changed the requirement those assertions encode; physics and all other assertions untouched.
- Delivery PR: #31
- Delivery Status: PR_OPEN_MANUAL_MERGE
- Delivery Merged At: Pending
