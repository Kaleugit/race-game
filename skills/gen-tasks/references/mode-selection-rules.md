# Mode Selection Rules For Epic Task Breakdown

Use these rules when assigning `Execution Mode` per task.

## Default
- Prefer `Standard`.

## Use Quick
- Low risk.
- No contract/schema/infra change.
- Up to 3 changed files.
- Estimated effort up to 2h.

## Use Critical
- Security-sensitive change.
- Data migration.
- Breaking API/interface/contract change.
- Sensitive deployment path.
- High regression risk.

## If Unclear
- Assign `Standard` and record uncertainty for human confirmation.

## Cross-Domain Tasks
- If a task spans multiple domains, it should be split into single-domain tasks with explicit dependencies.
- A cross-domain task is a signal that the epic breakdown may need revision.
