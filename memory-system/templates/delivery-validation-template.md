# Delivery Validation Note

Use this template before running `skills/delivery/scripts/deliver-to-main.sh`.
Suggested file path:
`memory-system/task-docs/TASK-<github-login>-<task-key>-[role|workstream]-delivery-validation-[YYYY-MM-DD].md`

## Metadata
- Date: YYYY-MM-DD HH:MM
- Task ID: TASK-<github-login>-<task-key>
- Branch: TASK-<github-login>-<task-key>-[role|workstream]
- Validated commit: <sha>
- Delivery Skill Version: v1

<!--
`Validated commit` is the branch tip (git rev-parse HEAD) at the moment this
semantic validation was produced. It is the baseline for the retry fast-path:
on a re-delivery, scripts/check-delivery-fastpath.sh compares it against the
current tip and, if only documentation moved (and no protected path), the
semantic verdict below may be inherited instead of re-derived. Refresh this
field to the new tip whenever you re-validate.
-->


## Scope Reviewed
- Files changed: [list]
- Contract sources reviewed:
  - `AGENTS.md`
  - `docs/PROJECT_SPECS.md`
  - `memory-system/1-project-context.md`
  - `memory-system/2-tasks.md`
  - `memory-system/tasks/TASK-<github-login>-<task-key>.md`

## Syntax Gate
- Command: `./scripts/validate-all.sh`
- Result: PASS/FAIL
- Notes: [short output summary]

## Semantic Gate
- Scope/criteria adherence: PASS/FAIL
- Task state coherence: PASS/FAIL
- Hidden workaround/ambiguity check: PASS/FAIL
- Summary: [short conclusion]

## Hygiene Gate
- Consolidated artifacts edited directly: YES/NO
- Housekeeping needed: YES/NO
- Protected boilerplate files changed: YES/NO
- If YES, boilerplate review note: [path]
- Notes: [short notes]

## Decision
<!-- VALIDATOR LITERAL: deliver-to-main.sh greps for the exact field name 'Ready for delivery script: YES'. Do not paraphrase. -->
- Ready for delivery script: YES/NO
- If NO, blocked by: [reason]
- If YES, planned command: `./skills/delivery/scripts/deliver-to-main.sh [options]`

## Follow-up
- [next action or none]
- Task file post-delivery update:
  - Status: COMPLETED/IN_PROGRESS
  - Delivery Status: PR_OPEN_AUTO_MERGE | PR_OPEN_MANUAL_MERGE | MERGED
  - Notes: [short summary]
