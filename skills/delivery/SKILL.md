---
name: delivery
description: Use this skill to perform semantic governance validation and deliver through PR to main with CI gate before merge, with explicit docs-only exception on main.

metadata:
  kind: workflow
---

# Delivery Skill

This skill centralizes pre-delivery operations for any role:
- semantic contract validation (natural language, by AI)
- PR-based integration delivery to `main` with CI gate (default for task branches)
- optional housekeeping recommendation (or execution when explicitly requested)

Use it as the default path for final delivery to `main`.

## Prerequisites
- `gh` (GitHub CLI) installed and authenticated (`gh auth status`).
- Git remote `origin` configured to the project repository with PR permissions.

## When To Use
- Task implementation is finished and ready to ship.
- You need contract validation stronger than syntax checks.
- You want to prepare files for a safe human delivery step.

## Inputs To Read
1. `memory-system/2-tasks.md`
2. `memory-system/tasks/`
3. `docs/PROJECT_SPECS.md`
4. `memory-system/1-project-context.md`
5. `AGENTS.md`
6. `scripts/validate-changed.sh` (incremental per-task gate) and `scripts/validate-all.sh` (repo-wide net)
7. `memory-system/workstreams/` (relevant workstreams for the task)

## Workflow

### Retry fast-path (re-delivery with a docs-only delta)
Runs before the full sequence. Applies only on a **re-delivery** — when a prior
delivery-validation note already exists for this task. Run:
`./scripts/check-delivery-fastpath.sh --note <validation-note-path>`.
- **Exit 0** (docs-only delta vs the note's `Validated commit`, no protected
  path): take the LIGHT path. Re-run step 1 (syntax) and step 2 (preflight) only,
  then update the note's `Validated commit` to the new tip (`git rev-parse HEAD`)
  and append a line `- Retry YYYY-MM-DD: docs-only delta since <old-sha>; semantic
  verdict inherited`. Skip steps 3–9 (semantic re-derivation, note rewrite,
  hygiene re-eval) and go straight to step 12 (delivery integration). This is
  sound because the validated code is byte-identical; only documentation moved.
- **Exit 1 / 2** (non-docs delta, protected path touched, or no usable baseline):
  run the full sequence below.

First delivery (no prior note) always runs the full sequence.

### Full sequence
1. Run syntax checks — **incremental** by default: `./scripts/validate-changed.sh`
   (validates only this branch's change set vs `origin/main`, ~seconds, attributable
   to THIS task). The repo-wide `./scripts/validate-all.sh` stays the net in CI
   (`governance.yml` on PR + push), and — under the gohorse optimistic model — runs
   once per wave at the boundary after merge (see
   `skills/gohorse/references/parallel-delta.md` § Optimistic delivery model).
   **Repo-wide-net dependency (must hold for the incremental gate to be safe):** either
   `governance.yml` is a **required** status check in branch protection, OR
   `ci-mode=off`. The delivery script enforces the off case automatically —
   `deliver-to-main.sh` runs the FULL `validate-all.sh` locally when
   `.governance/ci-mode.conf` is `off` (no CI net) or `origin/main` is unavailable, and
   the cheap incremental gate only when CI is the repo-wide net. So gohorse-light and
   standalone deliveries never lose the repo-wide net.
2. Completion-contract preflight: for the task being delivered, run
   `./scripts/validate-conventions.sh --completion-preflight memory-system/tasks/TASK-<github-login>-<task-key>.md`.
   If it fails (missing `prior-art`, `Report`, or `Evidence`), fix the task
   metadata now and re-run before proceeding. This catches completion-gated
   field omissions in ~1s, before the expensive semantic validation pass —
   the field requirement is otherwise only enforced once `Status` is flipped to
   `COMPLETED`, which happens late (step 14), forcing a full re-run.
3. Read core contract files (`AGENTS.md`, `docs/PROJECT_SPECS.md`, `memory-system/1-project-context.md`, `memory-system/2-tasks.md`, `memory-system/tasks/`) and changed files.
4. Detect protected boilerplate changes in branch diff (`origin/main...<task-branch>`):
   - protected paths source: `references/protected-boilerplate-paths.txt`
   - **Run `git fetch origin` FIRST**, then review the protected paths BOTH ways:
     `git merge-tree --write-tree origin/main HEAD` (every conflicted path) AND
     two-dot `git diff origin/main..HEAD` (every protected path). Both are
     required, and neither substitutes for the other: the three-dot diff above
     resolves to the MERGE-BASE, so on a stale branch it cannot show what `main`
     gained since the branch point; `merge-tree` only surfaces paths that actually
     CONFLICT, so a rule duplicated in another region of the same file — or in a
     different file — merges clean and stays invisible. Only two-dot shows the
     branch against the real current tip. INC-2026-08-17 (ADR-015) was approved on
     three-dot alone and the duplication surfaced only at merge, by luck of a
     textual collision.
   - when detected, call `architect` for evaluation and record note from:
     `memory-system/templates/boilerplate-change-review-template.md`
   - architect decides upstream action: `NONE | ISSUE | PR | PR_AND_ISSUE`
   - for upstream push/PR, use:
     `./skills/delivery/scripts/manage-upstream-contribution.sh`
     (script temporarily enables push on `upstream` remote and restores it after completion)
5. Perform semantic validation in natural language:
   - Is behavior aligned with scope/criteria?
   - Is task state/flow coherent?
   - Is there hidden workaround or ambiguity?
6. Register semantic validation outcome in a task artifact using `memory-system/templates/delivery-validation-template.md`. Record `Validated commit:` as the current branch tip (`git rev-parse HEAD`) — this is the baseline the retry fast-path compares against.
7. Apply obvious, low-risk fixes automatically (typos, missing required field labels, clear inconsistencies).
8. Re-run syntax checks if any file changed.
9. Evaluate repository hygiene:
   - orphan/obsolete artifacts?
   - inconsistent memory/workstream organization?
   - stale placeholders in docs not covered by syntax gate?
   - consolidated artifacts edited directly (`2-tasks.md`, `session-log.md`, `workstreams/*/notes.md`)?
10. If housekeeping is relevant:
   - suggest using `skills/housekeeping/`, or
   - run it only when explicitly requested by the human.
11. If still semantically non-adherent or ambiguous, stop and report to human.
12. If adherent, run delivery integration script:
   - `./skills/delivery/scripts/deliver-to-main.sh --validation-note <path>`
   - for dependency-ordered batches: `./skills/delivery/scripts/deliver-multi-task.sh --tasks <TASK-ID[,TASK-ID...]>`
13. Confirm PR status and (auto)merge status.
14. Update task delivery metadata in `memory-system/tasks/TASK-<github-login>-<task-key>.md`:
   - set `Status: COMPLETED`
   - set/refresh `Last Updated` and `Completed`
   - set `Delivery Handoff: DONE (owner: skills/delivery)`
   - set `Delivery PR` and `Delivery Status` (`PR_OPEN_AUTO_MERGE | PR_OPEN_MANUAL_MERGE | MERGED`)
   - set `Delivery Merged At` when merge is already confirmed
   - this update is executed by the delivery script on task branches
15. If task is epic-linked (ID contains `EP-XXX`), update task Status to
   `COMPLETED` in the corresponding `docs/EPICO-<ID>-<slug>-TASKS.md`.
   Also update the epic doc `Last Updated` field.
16. Documentation exception:
   - direct flow on `main` is allowed only for docs-only scope changes;
   - use `./skills/delivery/scripts/deliver-to-main.sh --docs-main`.
17. Finalize local context after successful delivery:
   - working tree clean;
   - if running on the primary workspace (including docs-only flow), end on `main` synchronized with `origin/main` via fast-forward;
   - if running on a linked task worktree and its current tip is already merged into `origin/main`, remove that worktree;
   - if the linked task worktree tip is not merged yet, keep the worktree clean on the task branch until merge confirmation.

## Required Outputs
- Semantic validation note in `memory-system/task-docs/` using `memory-system/templates/delivery-validation-template.md`.
- Boilerplate review note in `memory-system/task-docs/` when protected boilerplate paths are changed.
- Delivery outcome recorded (`PR created/updated`, CI gate status, merge mode).
- Task file delivery metadata updated (`Status`, `Completed`, `Last Updated`, and delivery fields).
- Epic task doc status updated to `COMPLETED` for epic-linked tasks (`docs/EPICO-<ID>-<slug>-TASKS.md`).

## Branch Commit (Before Delivery)
- Commits in task branches must be made directly by the agent.
- Use selective `git add` only for files in task scope (no `git add -A`).
- Commit format: `<type>(task-<github-login>-<task-key>[-<scope>]): <description>`.
- Delivery may create one additional task-branch commit to persist delivery metadata updates.

## Mandatory Rules
- Completion-contract preflight must pass before semantic validation begins.
- The retry light path (inheriting a prior semantic verdict) is allowed only when `./scripts/check-delivery-fastpath.sh` exits 0; on exit 1/2 the full semantic ceremony runs (and architect review when a protected path changed).
- Never bypass semantic validation in natural language before shipping.
- Semantic validation must be documented before running delivery script.
- Delivery script must receive (or auto-resolve) a matching validation note for the same `TASK-<github-login>-<task-key>`.
- If protected boilerplate paths changed, delivery script must receive (or auto-resolve) a matching architect boilerplate review note.
- Obvious corrections can be applied automatically.
- Non-obvious semantic conflicts must be escalated to human before delivery.
- This skill must open/update PR to `main` and rely on CI before merge.
- This skill owns the final task lifecycle update in `memory-system/tasks/` after PR delivery steps.
- Documentation-only scope may be delivered directly on `main` as a project-level exception.
- Repository must enforce required checks on PR to `main` (branch protection/ruleset).
- Repository CI must fail direct `main` commits that include non-documentation files.
- If housekeeping need is detected, explicitly communicate that before delivery.
- In task branches, update only source fragments/files (not consolidated generated artifacts).
- Gate 0 bootstrap is advisory and requires human/architectural risk validation.
- Placeholders in `Planning`/`Report` are invalid in the syntax gate for `Standard/Critical` tasks.
- After successful delivery, workspace must end clean; primary workspaces return to `main`, while merged linked task worktrees are removed.

## Reference Files
- Delivery checklist: `references/delivery-contract-checklist.md`
- Protected boilerplate paths: `references/protected-boilerplate-paths.txt`
- Delivery validation template: `../../memory-system/templates/delivery-validation-template.md`
- Boilerplate review template: `../../memory-system/templates/boilerplate-change-review-template.md`
