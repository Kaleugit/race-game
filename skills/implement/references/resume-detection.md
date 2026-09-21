# Resume Detection Guide

When `/implement` starts, check existing artifacts to determine the current
phase. This enables seamless session continuity when the user starts a new
session for the same task.

## Detection Matrix

| Artifact State | Detected Phase | Action |
|---|---|---|
| No task file | Phase 0 | Create task and start fresh |
| Task `PENDING`, no planning | Phase 0 | Load context, set `IN_PROGRESS` |
| Task `IN_PROGRESS`, no planning doc | Phase 1 | Begin analysis |
| Task `IN_PROGRESS`, planning exists, no approval marker and approval is required by mode/risk | Phase 2 | Present plan for approval |
| Task `IN_PROGRESS`, planning approved, no report | Phase 3 | Resume execution |
| Task `IN_PROGRESS`, validation evidence incomplete | Phase 4 | Resume validation |
| Task `IN_PROGRESS`, validation evidence complete, no `Delivery Handoff` marker | Phase 5 | Prepare delivery handoff |
| Task `IN_PROGRESS`, `Delivery Handoff` marker exists | Handoff done | Wait human/supervisor to run `/delivery` |
| Task `COMPLETED` | Done | Report already completed |
| Task `BLOCKED` | Blocked | Report blocker and ask human |

## How To Check Each Artifact

### Task file
- Path: `memory-system/tasks/TASK-<github-login>-<task-key>.md`
- Read `Status` field.
- Read `Execution Mode` field to determine artifact requirements.

### Planning doc
- Path pattern: `memory-system/task-docs/TASK-<github-login>-<task-key>-*-planning-*.md`
- Check `Ready Checklist` section for approval indicators.
- If all checklist items are checked, planning is approved.
- For `Standard` tasks without ambiguity/high risk, approval may be marked as not required.

### Report doc
- Path pattern: `memory-system/task-docs/TASK-<github-login>-<task-key>-*-report-*.md`
- Existence with PASS/FAIL evidence indicates Phase 4 is complete.

### Delivery handoff marker
- Path: task file `memory-system/tasks/TASK-<github-login>-<task-key>.md`
- Field: `Delivery Handoff: PENDING (owner: human/supervisor)`
- Existence indicates `/implement` finished and handoff is complete.

### Evidence field (Quick mode only)
- In the task file itself, check for `Evidence` field with `PASS` or `FAIL`.

## Quick Mode Detection

Quick mode does not produce separate planning/report docs. Detection
relies on the task file fields:
- No `Evidence` field -> Phase 1 or Phase 3 (check if implementation exists on branch)
- `Evidence` field present, no handoff marker -> Phase 5
- `Evidence` + handoff marker present -> handoff done, wait external `/delivery`

## Edge Cases

### Partial Phase 3 (execution started but not complete)
Resume detection cannot determine how far execution progressed. It detects
"planning approved, no report" and suggests Phase 3. The agent should:
1. Check git log on the task branch for existing commits.
2. Compare with the planning doc steps.
3. Report progress to human and confirm where to resume.

### Mode escalation mid-task
If the task file shows a different mode than artifacts suggest (e.g., Quick
mode but planning doc exists), respect the current mode in the task file.
The escalation was intentional.

## Resume Protocol

Inform human of detected phase and resume immediately. Do not wait for confirmation. Exception: `BLOCKED` state requires human input.

```
Detected task TASK-<github-login>-<task-key> at Phase N.
Reason: <artifact state that led to detection>.
Execution mode: <Quick/Standard/Critical>.
Resuming from Phase N.
```

Proceed directly with execution after reporting.
