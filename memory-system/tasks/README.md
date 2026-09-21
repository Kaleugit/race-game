# Task Files

Each task must have its own file in this directory.

## Conventions
- File name: `TASK-<github-login>-<task-key>.md`
- Task key:
  - epic-linked task: `EP-<nnn>-<tt>`
  - ad-hoc task: `YYYYMMDDHHMMSS`
- Recommended ID generation:
  - ad-hoc: `./scripts/generate-task-id.sh --login <github-login>`
  - epic-linked: `./scripts/generate-task-id.sh --login <github-login> --epic-id EP-001 --task-number 01`
- Branch per task: `TASK-<github-login>-<task-key>-<role|workstream>`
- Task state is tracked inside the task file itself.

## Mandatory Fields
- `Status`
- `Priority`
- `Depends On`
- `Blocked By`
- `Branch`
- `Workstreams`
- `Execution Mode`
- `Last Updated`

## Mandatory Fields By Mode/State
- `Standard/Critical` in `IN_PROGRESS|BLOCKED|COMPLETED`: `Planning`
- `Standard/Critical` in `COMPLETED`: `Report`
- `Quick` in `COMPLETED`: `Evidence` with `PASS/FAIL` and executed command/check

## Aggregated Index
- Consolidated summary is `memory-system/2-tasks.md`.
- Task branches should prioritize updates to `memory-system/tasks/*.md`.
- Consolidated index in `2-tasks.md` is generated only in CI on `main`.
- Do not manually edit/reconcile consolidated artifacts in task branches.

## Consolidated Memory Artifacts
- `memory-system/session-log.md` is automatically consolidated in CI on `main`.
- `memory-system/workstreams/*/notes.md` is automatically consolidated in CI on `main`.
- In task branches, edit only fragments:
  - `memory-system/session-log.d/*.md`
  - `memory-system/workstreams/*/notes.d/*.md`
