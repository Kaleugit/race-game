---
name: solve-issues
description: Use this workflow skill to analyze repository issues and pull requests, propose improvement/fix opportunities for human approval, and orchestrate implementation of approved items with commit/push evidence.

metadata:
  kind: workflow
---

# Solve Issues Skill

This workflow keeps the repository healthy by turning issue/PR signals into
approved, traceable improvements.

## When To Use
- Human asks for periodic repository optimization/maintenance.
- Human asks for a manual pass over issues and pull requests.
- Team wants a controlled flow from suggestions to implementation.

## Inputs To Read
1. `AGENTS.md`
2. `docs/PROJECT_SPECS.md`
3. `memory-system/2-tasks.md`
4. Relevant task files in `memory-system/tasks/`
5. Latest fragments in:
   - `memory-system/session-log.d/*.md`
   - `memory-system/workstreams/review/notes.d/*.md`
6. Repository issue/PR sources (prefer `gh` CLI):
   - `gh issue list --state open`
   - `gh pr list --state open`
   - optional: `gh pr list --state merged --search "updated:>=<date>"`

## Trigger Modes
- Manual: human invokes the skill ad hoc.
- Periodic: run on a regular cadence (for example weekly) with explicit human owner.

## Workflow
1. Collect candidates from issues and PRs.
   - Gather title, labels, age, assignee/reviewer state, and linked files/areas.
   - Exclude noise (`question`, duplicates, blocked items) unless human asks otherwise.
   - **Reopened issues = active contestation, not the original scope.** If an issue has a
     `reopened` event AFTER its last `closed` (heuristic: `reopened_at > last_closed_at`),
     its live scope is the **reopen/last comment**, NOT the original body/title. Read that
     comment and assess the candidate against the **specific gap it raises** — never
     pattern-match the original "N parts already implemented". A reopen is a strong signal
     that the prior "already-resolved" did not satisfy the author. (Evidence: #48/#69 —
     a reopen flagging a double-failure was bounced-closed by re-listing the original
     3 parts without touching the new point.)
2. Build an opportunity shortlist.
   - Classify each candidate as `fix`, `refactor`, `quality`, `security`, or `docs`.
   - Estimate impact, regression risk, and expected effort.
   - Prefer root-cause improvements over symptom patches.
3. Propose suggestions to the human (mandatory approval gate).
   - Present each suggestion with: rationale, expected benefit, risk, and test approach.
   - Human decision per item: `APPROVE`, `REJECT`, or `DEFER`.
   - Never implement without explicit `APPROVE`.
4. Orchestrate approved items via `implement` + `delivery`.
   - Create or reuse `TASK-<github-login>-<task-key>` artifacts per approved item.
   - Choose execution mode (`Quick`, `Standard`, `Critical`) per risk.
   - **Create/update the task file INSIDE the task worktree, never in `main`.**
     Required order of operations: (1) generate task id, (2) create the task
     worktree, (3) ONLY THEN `Write` the task file at
     `<worktree>/memory-system/tasks/TASK-<github-login>-<task-key>.md`.
     If the task file is authored in `main` (or any non-task worktree), it is
     not included in the PR squash, so the post-merge Action
     `finalize-task-metadata.yml` skips silently with `task file not found`
     and `Status: COMPLETED` must be backfilled by hand. Same rule applies to
     `memory-system/task-docs/TASK-...` artifacts.
   - For each approved item, invoke `/implement` for end-to-end task execution:
     - `implement` handles context, analysis (delegating to persona skills), execution, validation, and handoff.
     - Do NOT implement directly — always delegate to `/implement` to ensure phase gates, worktree isolation, and structured validation.
   - After implement completes, invoke `/delivery` for semantic validation and PR to `main`.
   - Do NOT push branches directly — always use `/delivery` for the PR flow.
5. Report outcome to human.
   - Include approved/rejected/deferred list.
   - Include implemented items with evidence (`PASS`/`FAIL` checks).
   - Include next periodic run recommendation.

## Mandatory Rules
- Do not auto-approve suggestions; human approval is required per item.
- Do not auto-close issues/PRs unless human explicitly requests it.
- Never re-close a **reopened** issue as already-resolved without addressing the specific
  point of its reopen/last comment. When `reopened_at > last_closed_at`, the closing
  justification MUST cite and either satisfy or explicitly refute that comment — not
  re-verify the original body. If the reopen raises a gap not covered by the prior fix,
  do NOT close: respond to the gap (implement, or escalate to the human).
- Do not bundle unrelated approved items in one commit.
- Do not skip validation/tests required by selected execution mode.
- Escalate to human if expected behavior or PASS/FAIL criteria are ambiguous.

## Required Output
- Suggestion list with status (`APPROVE`/`REJECT`/`DEFER`).
- Implementation trace for approved items (task IDs, branches, commits, pushes).
- Validation evidence per approved item.
- Brief periodic-maintenance recommendation (next run window + focus areas).

## Reference Skills
- `skills/review/SKILL.md`
- `skills/implement/SKILL.md`
- `skills/testing/SKILL.md`
- `skills/delivery/SKILL.md`
