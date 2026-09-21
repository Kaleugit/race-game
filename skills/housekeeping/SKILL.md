---
name: housekeeping
description: Use this skill to keep repository structure, memory files, and docs organized with minimal and safe cleanup actions.

metadata:
  kind: workflow
---

# Housekeeping Skill

This skill performs lightweight project hygiene without changing product behavior.

## When To Use
- Repository has stale/duplicated operational artifacts.
- Memory and task files are drifting in structure.
- Delivery identifies organizational debt before ship.

## Inputs To Read
1. `AGENTS.md`
2. `memory-system/2-tasks.md`
3. `memory-system/tasks/`
4. `memory-system/session-log.md`
5. `memory-system/workstreams/`
6. `docs/`

## Workflow
1. Identify low-risk cleanup candidates:
   - obsolete placeholders in completed docs
   - inconsistent headings/metadata
   - stale temporary files or dead local links
2. Propose or apply safe structural cleanup (no functional behavior changes).
3. Keep changes minimal and traceable.
4. Run syntax governance checks: `./scripts/validate-all.sh`.
5. Report what was changed and why.

## Mandatory Rules
- Do not delete useful project history.
- Do not rewrite semantics under the guise of cleanup.
- Never remove mandatory governance artifacts required by `AGENTS.md`.
- Escalate to human if cleanup scope is ambiguous.

## Reference Files
- `references/housekeeping-checklist.md`
