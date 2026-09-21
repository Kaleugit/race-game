# Delivery Contract Checklist

Use this checklist before delivery integration to `main`.

## Syntax Gate
- `./scripts/validate-all.sh` passes.
- No direct edits in PR for consolidated artifacts:
  - `memory-system/2-tasks.md`
  - `memory-system/session-log.md`
  - `memory-system/workstreams/*/notes.md`

## Semantic Gate
- A semantic validation note exists in `memory-system/task-docs/` using `memory-system/templates/delivery-validation-template.md`.
- Delivery skill reviewed contract files and changed files in natural language.
- Delivery skill checked protected boilerplate paths from `skills/delivery/references/protected-boilerplate-paths.txt`.
- If protected boilerplate files changed, architect review note exists using `memory-system/templates/boilerplate-change-review-template.md`.
- Semantic adherence is clear (`PASS`) with no unresolved ambiguity.
- Obvious corrections were auto-applied when safe.
- If ambiguity remained, flow was stopped and escalated to human.
- For `Quick` tasks, `Evidence` quality is semantically checked (`PASS/FAIL` + command/check), even though syntax gate checks only field presence.
- Bootstrap completeness is reviewed semantically by skill/human; CI does not block bootstrap placeholders.
- `Planning`/`Report` references in `Standard/Critical` tasks are syntactically validated (no placeholders).
- Task board semantic rules are respected (status, branch, mode).
- Housekeeping need was evaluated and reported.
- Task file delivery lifecycle metadata is coherent (`Status`, `Completed`, `Last Updated`, delivery fields).

## Canonical Validator Tokens
`deliver-to-main.sh` runs strict `grep` checks against two literal tokens. Any deviation (different wording, missing colon, missing line, missing parent section) aborts delivery before the PR is opened or updated.

- Validation note must include the literal line: `Ready for delivery script: YES` (`deliver-to-main.sh:766`).
- Boilerplate review note must include the literal line: `Delivery unblock: YES` (`deliver-to-main.sh:683`).

The templates `memory-system/templates/delivery-validation-template.md` and `memory-system/templates/boilerplate-change-review-template.md` already use these strings. When filling them in, flip only the value (`YES` ↔ `NO`); do not paraphrase the field name.

## Git Gate
- Delivery skill ran `./skills/delivery/scripts/deliver-to-main.sh` with a valid semantic note (`--validation-note <path>` or auto-resolved match).
- If protected boilerplate files changed, delivery used `--boilerplate-review-note <path>` (or auto-resolved match) with architect unblock.
- Branch follows `TASK-<github-login>-<task-key>-[role|workstream]`.
- PR to `main` exists and passed required CI checks.
- Auto-merge (or manual merge) executed only after CI approval.
- Documentation exception: direct push on `main` is allowed via `--docs-main` when all changed files are docs-only by policy.
- Upstream contribution (PR/issue) uses `./skills/delivery/scripts/manage-upstream-contribution.sh` when architect requests it.
- Task branch includes delivery metadata commit when fields required update.
- After successful delivery script execution, local workspace ends clean; primary workspaces return to `main`, and linked task worktrees are removed once their current tip is merged into `origin/main`.
