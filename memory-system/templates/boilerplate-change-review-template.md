# Boilerplate Change Review Note

Use this template when delivery detects changes in protected boilerplate files.
Suggested file path:
`memory-system/task-docs/TASK-<github-login>-<task-key>-[role|workstream]-boilerplate-review-[YYYY-MM-DD].md`

## Metadata
- Date: YYYY-MM-DD HH:MM
- Task ID: TASK-<github-login>-<task-key>
- Branch: TASK-<github-login>-<task-key>-[role|workstream]
- Requested by Skill: delivery

## Protected Changes Detected
- Files: [list]
- Why protected: [short rationale]

## Architect Assessment
- Architect review completed: YES/NO
- Decision summary: [short summary]
- Upstream action: NONE | ISSUE | PR | PR_AND_ISSUE
- Rationale for upstream action: [short rationale]

## Upstream Execution Plan
- Issue command/check: [command or N/A]
- PR command/check: [command or N/A]

## Delivery Gate
<!-- VALIDATOR LITERAL: deliver-to-main.sh greps for the exact field name 'Delivery unblock: YES'. Do not paraphrase. -->
- Delivery unblock: YES/NO
- If NO, blocked by: [reason]
- Follow-up owner: [name/role]
