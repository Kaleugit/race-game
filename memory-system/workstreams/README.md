# Workstreams Memory

This directory stores operational memory by workstream.

## Goal
- Organize context by work domain, not by a fixed role list.
- Allow dynamic workstream evolution as the project grows.

## Recommended Structure Per Workstream
Each subdirectory may contain:
- `notes.md` (generated consolidated file)
- `notes.d/*.md` (append-only fragments per task/worktree)
- `history.md`

Note:
- `notes.md` is automatically reconciled from `notes.d/*.md`.
- Files remain optional and should exist only when they provide memory value.

## Skill -> Workstream Mapping
- Default rule: `skills/<skill>/` maps to `memory-system/workstreams/<skill>/`.
- Exceptions/aliases live in `memory-system/workstreams/aliases.conf`:
  - Format: `skill=workstream`
  - Example:
    - `bootstrap=architect`
    - `delivery=devops`
    - `release=devops`
    - `implement=development`
    - `update-docs=architect`
    - `update-upstream=devops`
- Workstream mapping is independent from skill taxonomy (`kind: persona|workflow`).
  - Both `persona` and `workflow` skills follow the same alias/default mapping rules.
  - `architect` should stay focused on architecture definition/alignment, mostly documentation tasks.
  - `development` is the default workstream for implementation execution orchestration.

## Conventions
- Use branch/artifact naming with `[role|workstream]` when applicable.
- Create a new workstream when there is no clear fit in the current set.
- Notes are optional and guided by future context value.
- When notes exist, prefer fragment files under `notes.d/*.md`.
